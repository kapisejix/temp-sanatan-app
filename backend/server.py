from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form, Depends
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import re
import hashlib
import time
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from bson import ObjectId
from cryptography.fernet import Fernet
import base64

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== SECURITY: ENCRYPTION =====================

def get_fernet_key():
    secret = JWT_SECRET.encode()
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)

def encrypt_value(value: str) -> str:
    if not value:
        return value
    return get_fernet_key().encrypt(value.encode()).decode()

def decrypt_value(encrypted: str) -> str:
    if not encrypted:
        return encrypted
    try:
        return get_fernet_key().decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted

def mask_secret(value: str) -> str:
    if not value or len(value) < 8:
        return "***"
    return value[:4] + "*" * (len(value) - 8) + value[-4:]

# ===================== SECURITY: INPUT SANITIZATION =====================

def sanitize_input(text: str) -> str:
    if not text:
        return text
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    dangerous_patterns = ['$where', '$regex', '$gt', '$lt', '$ne', '$or', '$and', '$nor', '$not', '$exists']
    for pattern in dangerous_patterns:
        if pattern in text and not text.startswith('{'):
            text = text.replace(pattern, '')
    return text.strip()

def sanitize_dict(data: dict) -> dict:
    cleaned = {}
    for k, v in data.items():
        if isinstance(v, str):
            cleaned[k] = sanitize_input(v)
        elif isinstance(v, dict):
            cleaned[k] = sanitize_dict(v)
        elif isinstance(v, list):
            cleaned[k] = [sanitize_input(i) if isinstance(i, str) else i for i in v]
        else:
            cleaned[k] = v
    return cleaned

# ===================== SECURITY: RATE LIMITING =====================

rate_limit_store = {}

def check_rate_limit(identifier: str, max_requests: int = 10, window_seconds: int = 60) -> bool:
    now = time.time()
    key = f"rl:{identifier}"
    if key not in rate_limit_store:
        rate_limit_store[key] = []
    rate_limit_store[key] = [t for t in rate_limit_store[key] if t > now - window_seconds]
    if len(rate_limit_store[key]) >= max_requests:
        return False
    rate_limit_store[key].append(now)
    return True

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# ===================== SECURITY: AUDIT TRAIL =====================

async def log_audit(action: str, admin_id: str = None, admin_email: str = None, details: dict = None, ip: str = "", status: str = "success"):
    audit = {
        "action": action,
        "admin_id": admin_id,
        "admin_email": admin_email,
        "details": details or {},
        "ip_address": ip,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_agent": ""
    }
    try:
        await db.audit_trail.insert_one(audit)
    except Exception as e:
        logger.error(f"Audit log failed: {e}")

# ===================== SECURITY: TOKEN BLACKLIST =====================

token_blacklist = set()

async def is_token_blacklisted(token: str) -> bool:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    if token_hash in token_blacklist:
        return True
    bl = await db.token_blacklist.find_one({"token_hash": token_hash})
    if bl:
        token_blacklist.add(token_hash)
        return True
    return False

async def blacklist_token(token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    token_blacklist.add(token_hash)
    await db.token_blacklist.insert_one({"token_hash": token_hash, "blacklisted_at": datetime.now(timezone.utc).isoformat()})

# ===================== SECURITY: MIDDLEWARE =====================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        ip = get_client_ip(request)
        path = request.url.path

        # Rate limit check for sensitive endpoints
        if path in ["/api/auth/admin/login", "/api/auth/user/send-otp", "/api/auth/user/verify-otp"]:
            if not check_rate_limit(f"{ip}:{path}", max_requests=5, window_seconds=60):
                await log_audit("rate_limit_exceeded", ip=ip, details={"path": path}, status="blocked")
                from starlette.responses import JSONResponse
                return JSONResponse(status_code=429, content={"detail": "Too many requests. Please wait before trying again."})

        response = await call_next(request)
        duration = round(time.time() - start, 3)

        # Log suspicious activity
        if response.status_code in [401, 403]:
            try:
                await db.security_events.insert_one({
                    "event_type": "auth_failure",
                    "ip_address": ip,
                    "path": path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "user_agent": request.headers.get("user-agent", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                pass

        if response.status_code >= 400:
            logger.warning(f"[{response.status_code}] {request.method} {path} - {ip} - {duration}s")

        return response

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Check blacklist
    if await is_token_blacklisted(token):
        raise HTTPException(status_code=401, detail="Token has been revoked")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        # Mobile user token (role="user") — look up app_users
        if payload.get("role") == "user":
            user = await db.app_users.find_one({"_id": ObjectId(payload["sub"])})
            if not user or not user.get("is_active", True):
                raise HTTPException(status_code=401, detail="User not found or inactive")
            result = serialize_doc(user)
            result["_ip"] = get_client_ip(request)
            return result
        # Admin token
        admin = await db.admin_users.find_one({"_id": ObjectId(payload["sub"])})
        if not admin or not admin.get("is_active", True):
            raise HTTPException(status_code=401, detail="User not found or inactive")
        result = serialize_doc(admin)
        result["_ip"] = get_client_ip(request)
        return result
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(roles: list):
    async def check(request: Request):
        admin = await get_current_admin(request)
        if admin["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return admin
    return check

# ===================== AUTH ENDPOINTS =====================

class AdminLoginReq(BaseModel):
    email: str
    password: str

class AdminRegisterReq(BaseModel):
    email: str
    password: str
    name: str
    role: str = "content_admin"

@api_router.post("/auth/admin/login")
async def admin_login(req: AdminLoginReq, request: Request, response: Response):
    ip = get_client_ip(request)
    email = sanitize_input(req.email.lower())

    admin = await db.admin_users.find_one({"email": email})
    if not admin:
        await log_audit("login_failed", admin_email=email, ip=ip, details={"reason": "email_not_found"}, status="failed")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, admin["password_hash"]):
        await log_audit("login_failed", admin_id=str(admin["_id"]), admin_email=email, ip=ip, details={"reason": "wrong_password"}, status="failed")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not admin.get("is_active", True):
        await log_audit("login_failed", admin_id=str(admin["_id"]), admin_email=email, ip=ip, details={"reason": "account_disabled"}, status="failed")
        raise HTTPException(status_code=403, detail="Account disabled")
    admin_id = str(admin["_id"])
    access_token = create_access_token(admin_id, admin["email"], admin["role"])
    refresh_token = create_refresh_token(admin_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    await db.admin_users.update_one({"_id": admin["_id"]}, {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat(), "last_login_ip": ip}})
    await log_audit("login_success", admin_id=admin_id, admin_email=email, ip=ip, details={"role": admin["role"]})
    return {"token": access_token, "user": serialize_doc(admin)}

@api_router.post("/auth/admin/register")
async def admin_register(req: AdminRegisterReq, admin: dict = Depends(require_role(["super_admin"]))):
    existing = await db.admin_users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.role not in ["super_admin", "content_admin", "moderator"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    doc = {
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "is_active": True,
        "created_by": admin["_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login_at": None
    }
    result = await db.admin_users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc.pop("password_hash", None)
    return doc

@api_router.get("/auth/me")
async def auth_me(request: Request):
    admin = await get_current_admin(request)
    admin.pop("password_hash", None)
    return admin

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        await blacklist_token(token)
    refresh = request.cookies.get("refresh_token")
    if refresh:
        await blacklist_token(refresh)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    await log_audit("logout", ip=get_client_ip(request))
    return {"message": "Logged out"}

@api_router.post("/auth/refresh")
async def auth_refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        admin = await db.admin_users.find_one({"_id": ObjectId(payload["sub"])})
        if not admin:
            raise HTTPException(status_code=401, detail="User not found")
        admin_id = str(admin["_id"])
        new_access = create_access_token(admin_id, admin["email"], admin["role"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"token": new_access}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ===================== FORGOT / RESET PASSWORD =====================

class ForgotPasswordReq(BaseModel):
    email: str

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordReq):
    import secrets
    email = req.email.lower().strip()
    admin = await db.admin_users.find_one({"email": email})
    if not admin:
        return {"message": "If this email exists, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "admin_id": str(admin["_id"]),
        "email": email,
        "token": token,
        "used": False,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # In production, send email. For now, log the reset link.
    reset_link = f"/reset-password?token={token}"
    logger.info(f"Password reset link for {email}: {reset_link}")
    await log_audit("password_reset_requested", admin_email=email, details={"token_preview": token[:8]})

    return {"message": "If this email exists, a reset link has been sent.", "debug_token": token}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordReq):
    token_doc = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if token_doc.get("expires_at") and token_doc["expires_at"] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    new_hash = hash_password(req.new_password)
    await db.admin_users.update_one({"_id": ObjectId(token_doc["admin_id"])}, {"$set": {"password_hash": new_hash}})
    await db.password_reset_tokens.update_one({"_id": token_doc["_id"]}, {"$set": {"used": True}})
    await log_audit("password_reset_completed", admin_email=token_doc.get("email"))

    return {"message": "Password reset successfully. You can now login with your new password."}

# ===================== CONTACT FORM =====================

@api_router.post("/public/contact")
async def submit_contact(request: Request):
    body = await request.json()
    contact = {
        "name": sanitize_input(body.get("name", "")),
        "email": sanitize_input(body.get("email", "")),
        "phone": sanitize_input(body.get("phone", "")),
        "subject": sanitize_input(body.get("subject", "")),
        "message": sanitize_input(body.get("message", "")),
        "ip": get_client_ip(request),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if not contact["name"] or not contact["message"]:
        raise HTTPException(status_code=400, detail="Name and message are required")
    await db.contact_submissions.insert_one(contact)
    return {"message": "Thank you! Your message has been received."}

@api_router.get("/admin/contacts")
async def list_contacts(admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    contacts = await db.contact_submissions.find({}).sort("created_at", -1).to_list(100)
    return [serialize_doc(c) for c in contacts]

# ===================== BIRTH CHART ANALYSIS (Enhanced) =====================

@api_router.post("/public/birth-chart")
async def analyze_birth_chart(request: Request):
    body = await request.json()
    name = body.get("name", "")
    dob = body.get("dob", "")
    birth_time = body.get("birth_time", "")
    birth_place = body.get("birth_place", "")

    if not name or not dob:
        raise HTTPException(status_code=400, detail="Name and date of birth are required")

    ip = get_client_ip(request)
    # Rate limit: 3 chart analyses per IP per day
    if not check_rate_limit(f"chart:{ip}", max_requests=3, window_seconds=86400):
        raise HTTPException(status_code=429, detail="Daily limit reached. Download the app for unlimited access.")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"chart-{uuid.uuid4()}",
            system_message="""You are an expert Vedic astrologer (Jyotish Shastra). Based on the user's birth details, provide a comprehensive analysis.

You MUST respond in this exact JSON format:
{
  "nakshatra": {"name_en": "", "name_hi": "", "num": 1, "pada": 1},
  "rashi": {"name_en": "", "name_hi": ""},
  "ruling_graha": {"name_en": "", "name_hi": "", "nature": "benefic/malefic"},
  "nakshatra_deity": "",
  "grah_dosh": [{"graha": "", "dosh_name": "", "description_hi": "", "description_en": ""}],
  "daily_mantras": [{"mantra_sa": "", "mantra_transliteration": "", "meaning_hi": "", "when_to_chant": "", "count": 108}],
  "recommended_pujas": [{"puja_name_hi": "", "puja_name_en": "", "description": "", "best_day": "", "deity": ""}],
  "remedies": [{"remedy_hi": "", "remedy_en": "", "type": "mantra/daan/vrat/gemstone/yantra"}],
  "gemstone": {"name_en": "", "name_hi": "", "wearing_finger": "", "wearing_day": ""},
  "lucky": {"numbers": [], "colors_hi": [], "colors_en": [], "day_hi": "", "day_en": ""},
  "personality_traits": {"strengths_hi": "", "strengths_en": "", "challenges_hi": "", "challenges_en": ""},
  "general_guidance_hi": "",
  "general_guidance_en": ""
}

If birth time is not provided, give analysis based on date and place only. Be specific with mantras in Sanskrit with transliteration."""
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")

        prompt = f"""Analyze the birth chart for:
- Name: {name}
- Date of Birth: {dob}
- Birth Time: {birth_time or 'Not provided'}
- Birth Place: {birth_place or 'Not provided'}

Provide complete Vedic astrology analysis with Nakshatra, Rashi, Grah Dosh, daily mantras, remedies, recommended pujas, gemstone, and lucky details. Respond ONLY in the JSON format specified."""

        ai_response = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON
        import json
        json_str = ai_response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]

        chart_data = json.loads(json_str.strip())

        # Save analysis
        await db.birth_chart_analyses.insert_one({
            "name": name, "dob": dob, "birth_time": birth_time, "birth_place": birth_place,
            "analysis": chart_data, "ip": ip,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"name": name, "dob": dob, "birth_time": birth_time, "birth_place": birth_place, "chart": chart_data}

    except json.JSONDecodeError:
        return {"name": name, "dob": dob, "chart": None, "raw_analysis": ai_response[:2000], "error": "Could not parse structured data"}
    except Exception as e:
        logger.error(f"Birth chart error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ===================== SITEMAP & SEO =====================

@api_router.get("/sitemap.xml")
async def sitemap():
    from starlette.responses import Response as StarletteResponse
    base_url = "https://sanatansaathi.com"
    urls = [f"<url><loc>{base_url}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>"]
    urls.append(f"<url><loc>{base_url}/blog</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>")
    urls.append(f"<url><loc>{base_url}/birth-chart</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>")

    posts = await db.blog_posts.find({"status": "published"}, {"slug": 1}).to_list(500)
    for p in posts:
        urls.append(f"<url><loc>{base_url}/blog/{p['slug']}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>")

    pages = await db.cms_pages.find({"is_active": True}, {"slug": 1}).to_list(50)
    for p in pages:
        urls.append(f"<url><loc>{base_url}/page/{p['slug']}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>")

    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{"".join(urls)}</urlset>'
    return StarletteResponse(content=xml, media_type="application/xml")

# ===================== ADMIN MANAGEMENT =====================

@api_router.get("/admin/admins")
async def list_admins(admin: dict = Depends(require_role(["super_admin"]))):
    admins = await db.admin_users.find({}, {"password_hash": 0}).to_list(100)
    return [serialize_doc(a) for a in admins]

@api_router.put("/admin/admins/{admin_id}")
async def update_admin(admin_id: str, request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    update = {}
    if "role" in body:
        if body["role"] not in ["super_admin", "content_admin", "moderator"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        update["role"] = body["role"]
    if "name" in body:
        update["name"] = body["name"]
    if "is_active" in body:
        update["is_active"] = body["is_active"]
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.admin_users.update_one({"_id": ObjectId(admin_id)}, {"$set": update})
    updated = await db.admin_users.find_one({"_id": ObjectId(admin_id)}, {"password_hash": 0})
    return serialize_doc(updated)

@api_router.delete("/admin/admins/{admin_id}")
async def delete_admin(admin_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    if admin_id == admin["_id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    await db.admin_users.update_one({"_id": ObjectId(admin_id)}, {"$set": {"is_active": False}})
    return {"message": "Admin deactivated"}

# ===================== DASHBOARD =====================

@api_router.get("/admin/dashboard")
async def dashboard_stats(admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    content_count = await db.content_items.count_documents({})
    published = await db.content_items.count_documents({"status": "published"})
    draft = await db.content_items.count_documents({"status": "draft"})
    katha_count = await db.katha_items.count_documents({})
    arti_count = await db.arti_items.count_documents({})
    granth_count = await db.granth_books.count_documents({})
    veda_count = await db.veda_books.count_documents({})
    user_count = await db.user_profiles.count_documents({})
    admin_count = await db.admin_users.count_documents({"is_active": True})
    chat_count = await db.vedachat_conversations.count_documents({})

    # Category breakdown
    categories = await db.content_items.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]).to_list(20)

    recent_content = await db.content_items.find({}, {"_id": 1, "title_en": 1, "category": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)

    return {
        "total_content": content_count,
        "published": published,
        "draft": draft,
        "kathas": katha_count,
        "artis": arti_count,
        "granths": granth_count,
        "vedas": veda_count,
        "users": user_count,
        "admins": admin_count,
        "chats": chat_count,
        "categories": [{"name": c["_id"] or "unknown", "count": c["count"]} for c in categories],
        "recent_content": [serialize_doc(c) for c in recent_content]
    }

# ===================== CONTENT ITEMS CRUD =====================

async def _resolve_item_collections(item_id: str):
    """Return (item_doc, items_coll_name, verses_coll_name) for a given item id.

    Most content lives in `content_items` + `content_verses`. The legacy
    Bhakti Category manager seeded many items into `bhakti_items` + `bhakti_verses`.
    This helper lets all downstream endpoints (edit, verses, audio, sync, publish
    validation) work transparently against either collection without the admin
    needing to know which one stores the item.
    """
    try:
        oid = ObjectId(item_id)
    except Exception:
        return None, "content_items", "content_verses"
    doc = await db.content_items.find_one({"_id": oid})
    if doc:
        return doc, "content_items", "content_verses"
    doc = await db.bhakti_items.find_one({"_id": oid})
    if doc:
        return doc, "bhakti_items", "bhakti_verses"
    return None, "content_items", "content_verses"


@api_router.get("/content/items")
async def list_content_items(category: Optional[str] = None, status: Optional[str] = None, skip: int = 0, limit: int = 50):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    items = await db.content_items.find(query, {"_id": 1, "category": 1, "slug": 1, "title_hi": 1, "title_en": 1, "deity": 1, "status": 1, "total_verses": 1, "sort_order": 1, "is_active": 1, "thumbnail_url": 1, "created_at": 1}).sort("sort_order", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.content_items.count_documents(query)
    return {"items": [serialize_doc(i) for i in items], "total": total}

@api_router.get("/content/items/{item_id}")
async def get_content_item(item_id: str):
    item, _coll, _vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_doc(item)

class ContentItemCreate(BaseModel):
    category: str
    title_hi: str
    title_en: str
    deity: Optional[str] = ""
    deity_hi: Optional[str] = ""
    description_hi: Optional[str] = ""
    description_en: Optional[str] = ""
    thumbnail_url: Optional[str] = ""
    audio_url: Optional[str] = ""
    has_beginner_mode: bool = True
    has_expert_mode: bool = True
    tags: List[str] = []
    supported_languages: List[str] = ["hi", "en", "sa"]
    is_premium: bool = False
    # Hybrid multilingual — optional per-language title/description map
    # shape: {"hi": {"title": "...", "description": "..."}, "en": {...}, ...}
    languages: Optional[Dict[str, Dict[str, str]]] = None

@api_router.post("/content/items")
async def create_content_item(req: ContentItemCreate, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    slug = req.title_en.lower().replace(" ", "-").replace("'", "")
    doc = {
        **req.model_dump(),
        "slug": slug,
        "total_verses": 0,
        "sort_order": 0,
        "is_active": True,
        "like_count": 0,
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["_id"]
    }
    result = await db.content_items.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@api_router.put("/content/items/{item_id}")
async def update_content_item(item_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    _item, coll, _ = await _resolve_item_collections(item_id)
    await db[coll].update_one({"_id": ObjectId(item_id)}, {"$set": body})
    updated = await db[coll].find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)

@api_router.delete("/content/items/{item_id}")
async def delete_content_item(item_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    _item, coll, vcoll = await _resolve_item_collections(item_id)
    await db[coll].delete_one({"_id": ObjectId(item_id)})
    await db[vcoll].delete_many({"item_id": item_id})
    return {"message": "Deleted"}

@api_router.patch("/content/items/{item_id}/status")
async def update_item_status(item_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    status = body.get("status")
    if status not in ["draft", "published", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    item, coll, vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Validate on publish — require title, primary language. For aarti require
    # video OR thumbnail per language. For non-aarti require >=1 verse.
    if status == "published":
        missing = []
        if not (item.get("title_hi") or item.get("title_en") or item.get("title_sa")):
            missing.append("title (hi/en/sa)")
        supported = item.get("supported_languages") or []
        if not supported:
            missing.append("supported_languages")
        is_aarti = (item.get("category") or "").lower() == "aarti"
        if is_aarti:
            languages = item.get("languages") or {}
            langs_missing_media = []
            for lang in supported:
                bucket = languages.get(lang) or {}
                if not ((bucket.get("video") or {}).get("url") or (bucket.get("thumbnail") or {}).get("url")):
                    langs_missing_media.append(lang)
            if langs_missing_media:
                missing.append(f"video OR thumbnail for [{', '.join(langs_missing_media)}]")
        else:
            verse_count = await db[vcoll].count_documents({"item_id": item_id})
            if verse_count < 1:
                missing.append("at least 1 verse")
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot publish — missing: {', '.join(missing)}"
            )
    await db[coll].update_one({"_id": ObjectId(item_id)}, {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": f"Status updated to {status}"}


@api_router.get("/content/items/{item_id}/publish-check")
async def publish_check(item_id: str, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    """Return a validation checklist for the Publish tab — does not mutate state."""
    item, _coll, vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    verse_count = await db[vcoll].count_documents({"item_id": item_id})
    audio_sync = item.get("audio_sync") or {}
    checks = [
        {"key": "title", "label": "Title (Hi/En/Sa)",
         "ok": bool(item.get("title_hi") or item.get("title_en") or item.get("title_sa"))},
        {"key": "primary_language", "label": "At least one supported language",
         "ok": bool(item.get("supported_languages"))},
    ]
    is_aarti = (item.get("category") or "").lower() == "aarti"
    if is_aarti:
        # Aarti has no verse-by-verse requirement; instead require video OR thumbnail
        # per supported language (spec §1C).
        languages = item.get("languages") or {}
        supported = item.get("supported_languages") or []
        missing_media = []
        for lang in supported:
            bucket = languages.get(lang) or {}
            has_video = bool((bucket.get("video") or {}).get("url"))
            has_thumb = bool((bucket.get("thumbnail") or {}).get("url"))
            if not (has_video or has_thumb):
                missing_media.append(lang)
        checks.append({
            "key": "aarti_media",
            "label": "Each language has a video OR thumbnail",
            "ok": len(missing_media) == 0,
            "detail": f"missing: {', '.join(missing_media)}" if missing_media else "all languages covered",
        })
        # Audio-without-sync warning (warn, allow publish) — marked optional
        audio_without_sync = []
        for lang in supported:
            bucket = languages.get(lang) or {}
            has_audio = bool(bucket.get("audio_versions"))
            has_sync = bool((bucket.get("sync") or {}).get("sync_map"))
            if has_audio and not has_sync:
                audio_without_sync.append(lang)
        checks.append({
            "key": "aarti_sync",
            "label": "Audio-text sync per language (optional)",
            "ok": len(audio_without_sync) == 0,
            "detail": f"{', '.join(audio_without_sync)} have audio but no sync" if audio_without_sync else "all synced",
            "optional": True,
        })
    else:
        checks += [
            {"key": "verses", "label": "At least 1 verse", "ok": verse_count >= 1,
             "detail": f"{verse_count} verse(s)"},
            {"key": "deity", "label": "Deity set (optional)",
             "ok": bool(item.get("deity") or item.get("deity_hi")), "optional": True},
            {"key": "audio", "label": "Audio uploaded (optional)",
             "ok": bool(audio_sync.get("audio_url")), "optional": True},
            {"key": "sync_map", "label": "Audio-text sync map (optional)",
             "ok": bool(audio_sync.get("sync_map")), "optional": True},
        ]
    can_publish = all(c["ok"] for c in checks if not c.get("optional"))
    return {
        "can_publish": can_publish,
        "current_status": item.get("status", "draft"),
        "checks": checks,
        "verse_count": verse_count,
    }

# ===================== CONTENT VERSES =====================

@api_router.get("/content/items/{item_id}/verses")
async def get_verses(item_id: str):
    _item, _coll, vcoll = await _resolve_item_collections(item_id)
    verses = await db[vcoll].find({"item_id": item_id}).sort("sort_order", 1).to_list(1000)
    return [serialize_doc(v) for v in verses]

class VerseCreate(BaseModel):
    verse_num: int
    verse_type: str = "shloka"
    sanskrit_text: str
    transliteration: str = ""
    audio_url: Optional[str] = ""

@api_router.post("/content/items/{item_id}/verses")
async def create_verse(item_id: str, req: VerseCreate, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    _item, coll, vcoll = await _resolve_item_collections(item_id)
    doc = {
        **req.model_dump(),
        "item_id": item_id,
        "sort_order": req.verse_num,
        "is_active": True,
        "audio_start_ms": 0,
        "audio_end_ms": 0
    }
    result = await db[vcoll].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    await db[coll].update_one({"_id": ObjectId(item_id)}, {"$inc": {"total_verses": 1}})
    return doc

async def _resolve_verse_collection(verse_id: str):
    """Return (verse_doc, collection_name) — searches content_verses first, then bhakti_verses."""
    try:
        oid = ObjectId(verse_id)
    except Exception:
        return None, "content_verses"
    doc = await db.content_verses.find_one({"_id": oid})
    if doc:
        return doc, "content_verses"
    doc = await db.bhakti_verses.find_one({"_id": oid})
    if doc:
        return doc, "bhakti_verses"
    return None, "content_verses"


@api_router.put("/content/verses/{verse_id}")
async def update_verse(verse_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    _v, vcoll = await _resolve_verse_collection(verse_id)
    await db[vcoll].update_one({"_id": ObjectId(verse_id)}, {"$set": body})
    updated = await db[vcoll].find_one({"_id": ObjectId(verse_id)})
    return serialize_doc(updated)

@api_router.get("/content/verses/{verse_id}/meanings")
async def get_verse_meanings(verse_id: str):
    meanings = await db.verse_meanings.find({"verse_id": verse_id}).to_list(20)
    return [serialize_doc(m) for m in meanings]

class MeaningCreate(BaseModel):
    language: str
    meaning: str
    word_breakdown: List[Dict[str, str]] = []

@api_router.post("/content/verses/{verse_id}/meanings")
async def create_meaning(verse_id: str, req: MeaningCreate, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    existing = await db.verse_meanings.find_one({"verse_id": verse_id, "language": req.language})
    if existing:
        await db.verse_meanings.update_one({"_id": existing["_id"]}, {"$set": req.model_dump()})
        updated = await db.verse_meanings.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    doc = {**req.model_dump(), "verse_id": verse_id}
    result = await db.verse_meanings.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

# ===================== KATHA =====================

@api_router.get("/katha/items")
async def list_kathas():
    items = await db.katha_items.find({}).sort("sort_order", 1).to_list(100)
    return [serialize_doc(i) for i in items]

@api_router.get("/katha/items/{katha_id}")
async def get_katha(katha_id: str):
    item = await db.katha_items.find_one({"_id": ObjectId(katha_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Katha not found")
    return serialize_doc(item)

@api_router.post("/katha/items")
async def create_katha(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body["sort_order"] = body.get("sort_order", 0)
    body["is_active"] = True
    body["status"] = "draft"
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.katha_items.insert_one(body)
    body["_id"] = str(result.inserted_id)
    return body

@api_router.put("/katha/items/{katha_id}")
async def update_katha(katha_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    await db.katha_items.update_one({"_id": ObjectId(katha_id)}, {"$set": body})
    updated = await db.katha_items.find_one({"_id": ObjectId(katha_id)})
    return serialize_doc(updated)

# ===================== ARTI =====================

@api_router.get("/arti/items")
async def list_artis():
    items = await db.arti_items.find({}).sort("sort_order", 1).to_list(100)
    return [serialize_doc(i) for i in items]

@api_router.get("/arti/items/{arti_id}")
async def get_arti(arti_id: str):
    item = await db.arti_items.find_one({"_id": ObjectId(arti_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Arti not found")
    lines = await db.arti_lines.find({"arti_id": arti_id}).sort("line_num", 1).to_list(200)
    result = serialize_doc(item)
    result["lines"] = [serialize_doc(l) for l in lines]
    return result

@api_router.post("/arti/items")
async def create_arti(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body["sort_order"] = body.get("sort_order", 0)
    body["is_active"] = True
    body["status"] = "published"
    result = await db.arti_items.insert_one(body)
    body["_id"] = str(result.inserted_id)
    return body

# ===================== BHAKTI CONTENT MANAGER =====================

# Unified Bhakti content categories: aarti, chalisa, namavali, sahasranama, vedic_mantra, stotram, suktam, ashtakam, shatkam, kavacham, nam_ramayanam

BHAKTI_CATEGORIES = [
    "aarti", "chalisa", "namavali", "sahasranama", "vedic_mantra",
    "stotram", "suktam", "ashtakam", "shatkam", "kavacham", "nam_ramayanam"
]

@api_router.get("/bhakti/items")
async def list_bhakti_items(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    query = {}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if status:
        query["status"] = status
    
    # Check bhakti_items collection first, then fallback to content_items
    items = await db.bhakti_items.find(query).sort("sort_order", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.bhakti_items.count_documents(query)
    
    # If no items in bhakti_items, check content_items with same category filter
    if not items and category in BHAKTI_CATEGORIES:
        items = await db.content_items.find(query).sort("sort_order", 1).skip(skip).limit(limit).to_list(limit)
        total = await db.content_items.count_documents(query)
    
    return {
        "items": [serialize_doc(i) for i in items],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@api_router.get("/bhakti/items/{item_id}")
async def get_bhakti_item(item_id: str):
    # Try bhakti_items first
    item = await db.bhakti_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        # Fallback to content_items
        item = await db.content_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    result = serialize_doc(item)
    
    # Get verses if they exist
    verses = await db.bhakti_verses.find({"item_id": item_id}).sort("verse_num", 1).to_list(1000)
    if verses:
        result["verses"] = [serialize_doc(v) for v in verses]
    else:
        # Try content_verses
        verses = await db.content_verses.find({"item_id": item_id}).sort("verse_num", 1).to_list(1000)
        if verses:
            result["verses"] = [serialize_doc(v) for v in verses]
    
    return result

@api_router.post("/bhakti/items")
async def create_bhakti_item(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body = sanitize_dict(body)
    
    category = body.get("category", "")
    if category not in BHAKTI_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(BHAKTI_CATEGORIES)}")
    
    # Generate slug
    title_en = body.get("title_en", "")
    slug_base = title_en.lower().replace(" ", "-").replace("'", "")
    slug = re.sub(r'[^a-z0-9-]', '', slug_base)
    
    # Check for unique slug
    existing = await db.bhakti_items.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    
    doc = {
        "category": category,
        "subcategory": body.get("subcategory", ""),
        "slug": slug,
        "title_hi": body.get("title_hi", ""),
        "title_en": title_en,
        "deity": body.get("deity", ""),
        "deity_hi": body.get("deity_hi", ""),
        "description_hi": body.get("description_hi", ""),
        "description_en": body.get("description_en", ""),
        "thumbnail_url": body.get("thumbnail_url", ""),
        "audio_url": body.get("audio_url", ""),
        "video_url": body.get("video_url", ""),
        "music_type": body.get("music_type", ""),
        "best_occasion": body.get("best_occasion", ""),
        "full_text": body.get("full_text", ""),
        "has_beginner_mode": body.get("has_beginner_mode", True),
        "has_expert_mode": body.get("has_expert_mode", True),
        "total_verses": len(body.get("verses", [])),
        "sort_order": body.get("sort_order", 0),
        "is_active": True,
        "is_premium": body.get("is_premium", False),
        "tags": body.get("tags", []),
        "supported_languages": body.get("supported_languages", ["hi", "en", "sa"]),
        "audio_timestamps": body.get("audio_timestamps", []),
        "like_count": 0,
        "status": "draft",
        "created_by": admin.get("admin_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.bhakti_items.insert_one(doc)
    item_id = str(result.inserted_id)
    doc["_id"] = item_id
    
    # Insert verses if provided
    verses = body.get("verses", [])
    if verses:
        for i, verse in enumerate(verses):
            verse_doc = {
                "item_id": item_id,
                "verse_num": verse.get("verse_num", i + 1),
                "verse_type": verse.get("verse_type", "shloka"),
                "sanskrit_text": verse.get("sanskrit_text", ""),
                "transliteration": verse.get("transliteration", ""),
                "meanings": verse.get("meanings", {}),
                "word_breakdown": verse.get("word_breakdown", []),
                "audio_start_ms": verse.get("audio_start_ms", 0),
                "audio_end_ms": verse.get("audio_end_ms", 0),
                "is_active": True
            }
            await db.bhakti_verses.insert_one(verse_doc)
    
    await log_audit("bhakti_item_created", admin.get("admin_id"), admin.get("email"), {"item_id": item_id, "category": category, "title": title_en})
    return doc

@api_router.put("/bhakti/items/{item_id}")
async def update_bhakti_item(item_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body = sanitize_dict(body)
    body.pop("_id", None)
    body.pop("created_at", None)
    body.pop("created_by", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Resolve which collection actually stores this item (legacy chalisa items
    # live in content_items, newer bhakti items live in bhakti_items).
    _item, item_coll, vcoll = await _resolve_item_collections(item_id)

    # Update verses if provided
    verses = body.pop("verses", None)
    if verses is not None:
        await db[vcoll].delete_many({"item_id": item_id})
        for i, verse in enumerate(verses):
            verse_doc = {
                "item_id": item_id,
                "verse_num": verse.get("verse_num", i + 1),
                "verse_type": verse.get("verse_type", "shloka"),
                "sanskrit_text": verse.get("sanskrit_text", ""),
                "transliteration": verse.get("transliteration", ""),
                "meanings": verse.get("meanings", {}),
                "word_breakdown": verse.get("word_breakdown", []),
                "audio_start_ms": verse.get("audio_start_ms", 0),
                "audio_end_ms": verse.get("audio_end_ms", 0),
                "is_active": True
            }
            await db[vcoll].insert_one(verse_doc)
        body["total_verses"] = len(verses)

    await db[item_coll].update_one({"_id": ObjectId(item_id)}, {"$set": body})
    updated = await db[item_coll].find_one({"_id": ObjectId(item_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")

    await log_audit("bhakti_item_updated", admin.get("admin_id"), admin.get("email"), {"item_id": item_id})
    return serialize_doc(updated)

@api_router.patch("/bhakti/items/{item_id}/status")
async def update_bhakti_status(item_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ["draft", "published", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    _item, item_coll, _vcoll = await _resolve_item_collections(item_id)
    await db[item_coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await log_audit("bhakti_status_changed", admin.get("admin_id"), admin.get("email"), {"item_id": item_id, "new_status": new_status})
    return {"success": True, "status": new_status}

@api_router.delete("/bhakti/items/{item_id}")
async def delete_bhakti_item(item_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    """Delete a bhakti item from whichever collection actually stores it
    (content_items legacy or bhakti_items newer)."""
    _item, item_coll, vcoll = await _resolve_item_collections(item_id)
    result = await db[item_coll].delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    await db[vcoll].delete_many({"item_id": item_id})
    # Also clean orphaned verses in the OTHER collection just in case
    other_vcoll = "bhakti_verses" if vcoll == "content_verses" else "content_verses"
    await db[other_vcoll].delete_many({"item_id": item_id})
    await log_audit("bhakti_item_deleted", admin.get("admin_id"), admin.get("email"), {"item_id": item_id})
    return {"success": True}

@api_router.post("/bhakti/bulk-delete")
async def bulk_delete_bhakti(request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    object_ids = [ObjectId(id) for id in ids]
    result = await db.bhakti_items.delete_many({"_id": {"$in": object_ids}})
    await db.bhakti_verses.delete_many({"item_id": {"$in": ids}})
    
    await log_audit("bhakti_bulk_delete", admin.get("admin_id"), admin.get("email"), {"count": result.deleted_count})
    return {"success": True, "deleted_count": result.deleted_count}

@api_router.post("/bhakti/bulk-export")
async def bulk_export_bhakti(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    object_ids = [ObjectId(id) for id in ids]
    items = await db.bhakti_items.find({"_id": {"$in": object_ids}}).to_list(1000)
    
    export_data = []
    for item in items:
        item_data = serialize_doc(item)
        verses = await db.bhakti_verses.find({"item_id": str(item["_id"])}).sort("verse_num", 1).to_list(1000)
        item_data["verses"] = [serialize_doc(v) for v in verses]
        export_data.append(item_data)
    
    return export_data

@api_router.post("/bhakti/bulk-tts")
async def bulk_generate_tts(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    ids = body.get("ids", [])
    category = body.get("category", "")
    
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Queue TTS generation (in production, this would trigger a background job)
    job_id = str(uuid.uuid4())
    await db.tts_jobs.insert_one({
        "job_id": job_id,
        "item_ids": ids,
        "category": category,
        "status": "queued",
        "created_by": admin.get("admin_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await log_audit("tts_generation_queued", admin.get("admin_id"), admin.get("email"), {"job_id": job_id, "item_count": len(ids)})
    return {"success": True, "job_id": job_id, "message": "TTS generation queued"}

# ===================== GRANTH =====================

@api_router.get("/granth/books")
async def list_granth_books():
    books = await db.granth_books.find({}).sort("sort_order", 1).to_list(20)
    return [serialize_doc(b) for b in books]

@api_router.get("/granth/books/{book_id}")
async def get_granth_book(book_id: str):
    book = await db.granth_books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.granth_chapters.find({"book_id": book_id}).sort("sort_order", 1).to_list(100)
    result = serialize_doc(book)
    result["chapters"] = [serialize_doc(c) for c in chapters]
    return result

@api_router.get("/granth/chapters/{chapter_id}/verses")
async def get_granth_verses(chapter_id: str, skip: int = 0, limit: int = 50):
    verses = await db.granth_verses.find({"chapter_id": chapter_id}).sort("sort_order", 1).skip(skip).limit(limit).to_list(limit)
    return [serialize_doc(v) for v in verses]

# ===================== VEDAS =====================

@api_router.get("/vedas/books")
async def list_veda_books():
    books = await db.veda_books.find({}).sort("sort_order", 1).to_list(20)
    return [serialize_doc(b) for b in books]

@api_router.get("/vedas/books/{book_id}")
async def get_veda_book(book_id: str):
    book = await db.veda_books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.veda_chapters.find({"book_id": book_id}).sort("sort_order", 1).to_list(100)
    result = serialize_doc(book)
    result["chapters"] = [serialize_doc(c) for c in chapters]
    return result


# ===================== VEDAS HIERARCHY (same as Granth) =====================

@api_router.get("/vedas/hierarchy/{book_id}")
async def get_vedas_hierarchy(book_id: str):
    """Get Vedas hierarchy: Book → Chapters/Mandalas → Verse counts."""
    book = await db.veda_books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    chapters = await db.veda_chapters.find({"book_id": book_id}).sort("chapter_num", 1).to_list(500)
    hierarchy = []
    for ch in chapters:
        ch_id = str(ch["_id"])
        verse_count = await db.veda_verses.count_documents({"chapter_id": ch_id})
        hierarchy.append({
            "id": ch_id,
            "chapter_num": ch.get("chapter_num"),
            "title_hi": ch.get("title_hi", ch.get("title", {}).get("hi", "")),
            "title_en": ch.get("title_en", ch.get("title", {}).get("en", "")),
            "verse_count": verse_count,
        })
    return {"book": serialize_doc(book), "chapters": hierarchy, "total_chapters": len(hierarchy)}


@api_router.get("/vedas/chapter-verses/{chapter_id}")
async def get_vedas_chapter_verses(chapter_id: str, lang: str = "hi", skip: int = 0, limit: int = 100):
    """Get verses for a Vedas chapter with multilingual meanings."""
    chapter = await db.veda_chapters.find_one({"_id": ObjectId(chapter_id)})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    verses = await db.veda_verses.find({"chapter_id": chapter_id}).sort("verse_num", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.veda_verses.count_documents({"chapter_id": chapter_id})
    result = []
    for v in verses:
        doc = serialize_doc(v)
        meaning_obj = v.get("meaning", v.get("meaning_hi", ""))
        if isinstance(meaning_obj, dict):
            doc["display_meaning"] = meaning_obj.get(lang, meaning_obj.get("hi", meaning_obj.get("en", "")))
        else:
            doc["display_meaning"] = str(meaning_obj) if meaning_obj else ""
        result.append(doc)
    return {"chapter": serialize_doc(chapter), "verses": result, "total": total, "language": lang}


@api_router.put("/vedas/verses/{verse_id}")
async def update_veda_verse(verse_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    body.pop("id", None)
    await db.veda_verses.update_one({"_id": ObjectId(verse_id)}, {"$set": body})
    updated = await db.veda_verses.find_one({"_id": ObjectId(verse_id)})
    return serialize_doc(updated)


@api_router.post("/vedas/upload-parse")
async def vedas_upload_parse(
    file: UploadFile = File(...),
    book_id: str = Form(""),
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Upload PDF/DOCX for a Vedas/Puranas book, parse with Claude, save to DB."""
    content = await file.read()
    now = datetime.now(timezone.utc).isoformat()
    fname = file.filename.lower()

    # Extract text
    raw_text = ""
    if fname.endswith(".pdf"):
        import pdfplumber, io
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    raw_text += text + "\n\n"
    elif fname.endswith((".docx", ".doc")):
        import io
        from docx import Document
        doc = Document(io.BytesIO(content))
        for para in doc.paragraphs:
            text = para.text
            if text.strip():
                is_bold = any(run.bold for run in para.runs if run.bold)
                style = para.style.name if para.style else ""
                if "Heading" in style or is_bold:
                    raw_text += f"\n[HEADING] {text}\n"
                else:
                    raw_text += f"{text}\n"
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files supported")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # Parse with Claude
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
        session_id=f"vedas-parse-{uuid.uuid4()}",
        system_message="""You are an expert in Hindu scriptures. Parse the uploaded text into structured chapter/verse format.

Extract:
- Chapter/Mandala divisions (identify by headings, numbering, or contextual clues)
- Individual verses/shlokas (identify by numbering, formatting, or Sanskrit verse patterns)
- For each verse: original Sanskrit text, transliteration (if present), Hindi meaning, English meaning

CRITICAL: Preserve 100% of text. NEVER truncate. Include ALL verses.

Return ONLY valid JSON:
{
  "book_title": "detected book name",
  "chapters": [{
    "chapter_num": 1,
    "title_hi": "chapter title in Hindi",
    "title_en": "chapter title in English",
    "verses": [{
      "verse_num": 1,
      "text_sa": "Sanskrit/original text with ALL line breaks preserved",
      "transliteration": "romanized text if available",
      "meaning_hi": "Hindi meaning",
      "meaning_en": "English meaning"
    }]
  }]
}"""
    )
    chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
    ai_resp = await chat.send_message(UserMessage(text=f"Parse this scripture text:\n\n{raw_text[:50000]}"))

    import json as json_mod
    json_str = ai_resp
    if "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0]
    elif "```" in json_str:
        json_str = json_str.split("```")[1].split("```")[0]
    parsed = json_mod.loads(json_str.strip())

    # Save to DB
    chapters_saved = 0
    verses_saved = 0
    for ch_data in parsed.get("chapters", []):
        ch_result = await db.veda_chapters.insert_one({
            "book_id": book_id,
            "chapter_num": ch_data.get("chapter_num", chapters_saved + 1),
            "title_hi": ch_data.get("title_hi", ""),
            "title_en": ch_data.get("title_en", ""),
            "title": {"hi": ch_data.get("title_hi", ""), "en": ch_data.get("title_en", "")},
            "total_verses": len(ch_data.get("verses", [])),
            "sort_order": ch_data.get("chapter_num", chapters_saved + 1),
        })
        ch_id = str(ch_result.inserted_id)
        for v_data in ch_data.get("verses", []):
            await db.veda_verses.insert_one({
                "chapter_id": ch_id,
                "book_id": book_id,
                "verse_num": v_data.get("verse_num", verses_saved + 1),
                "text_sa": v_data.get("text_sa", ""),
                "transliteration": v_data.get("transliteration", ""),
                "meaning_hi": v_data.get("meaning_hi", ""),
                "meaning_en": v_data.get("meaning_en", ""),
                "meaning": {"hi": v_data.get("meaning_hi", ""), "en": v_data.get("meaning_en", "")},
                "sort_order": v_data.get("verse_num", verses_saved + 1),
            })
            verses_saved += 1
        chapters_saved += 1

    # Update book stats
    if book_id:
        total_ch = await db.veda_chapters.count_documents({"book_id": book_id})
        await db.veda_books.update_one({"_id": ObjectId(book_id)}, {"$set": {"total_chapters": total_ch, "parsing_status": "completed"}})

    return {"message": f"Parsed and saved {chapters_saved} chapters, {verses_saved} verses", "stats": {"chapters": chapters_saved, "verses": verses_saved}}

# ===================== PANCHANG =====================

@api_router.get("/admin/panchang")
async def list_panchang(admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    items = await db.panchang.find({}).sort("date", -1).to_list(100)
    return [serialize_doc(i) for i in items]

@api_router.post("/admin/panchang")
async def create_panchang(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.panchang.insert_one(body)
    body["_id"] = str(result.inserted_id)
    return body

@api_router.put("/admin/panchang/{panchang_id}")
async def update_panchang(panchang_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    await db.panchang.update_one({"_id": ObjectId(panchang_id)}, {"$set": body})
    updated = await db.panchang.find_one({"_id": ObjectId(panchang_id)})
    return serialize_doc(updated)

# ===================== VEDACHAT AI =====================

@api_router.post("/vedachat/message")
async def vedachat_message(request: Request):
    admin = await get_current_admin(request)
    body = await request.json()
    message_text = body.get("message", "")
    conversation_id = body.get("conversation_id")

    if not message_text:
        raise HTTPException(status_code=400, detail="Message is required")

    # Get or create conversation
    if conversation_id:
        conv = await db.vedachat_conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        messages = conv.get("messages", [])
    else:
        messages = []
        conv = None

    user_msg = {
        "role": "user",
        "content": message_text,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    messages.append(user_msg)

    # ---- BUILD SCRIPTURE CONTEXT FROM DATABASE ----
    scripture_context = ""
    try:
        # Search across all content collections for relevant verses
        search_terms = message_text.lower().split()
        search_regex = "|".join([t for t in search_terms if len(t) > 2])

        # Search in granth verses
        granth_results = []
        if search_regex:
            granth_verses = await db.granth_verses.find({
                "$or": [
                    {"sanskrit": {"$regex": search_regex, "$options": "i"}},
                    {"transliteration": {"$regex": search_regex, "$options": "i"}},
                    {"meaning.hi": {"$regex": search_regex, "$options": "i"}},
                    {"meaning.en": {"$regex": search_regex, "$options": "i"}},
                ]
            }).limit(10).to_list(10)

            for v in granth_verses:
                chapter = await db.granth_chapters.find_one({"_id": ObjectId(v.get("chapter_id", ""))}) if v.get("chapter_id") else None
                book = await db.granth_books.find_one({"_id": ObjectId(v.get("book_id", ""))}) if v.get("book_id") else None
                book_name = book.get("title_en", book.get("title", {}).get("en", "Unknown")) if book else "Unknown"
                ch_num = chapter.get("chapter_num", "?") if chapter else "?"
                ch_name = (chapter.get("title_en", chapter.get("title", {}).get("en", "")) if chapter else "")
                meaning_obj = v.get("meaning", {})
                meaning_hi = meaning_obj.get("hi", "") if isinstance(meaning_obj, dict) else str(meaning_obj)
                meaning_en = meaning_obj.get("en", "") if isinstance(meaning_obj, dict) else ""
                granth_results.append({
                    "book": book_name, "chapter": ch_num, "chapter_name": ch_name,
                    "verse": v.get("verse_num"), "sanskrit": v.get("sanskrit", ""),
                    "transliteration": v.get("transliteration", ""),
                    "meaning_hi": meaning_hi, "meaning_en": meaning_en,
                })

        # Search in veda verses
        veda_results = []
        if search_regex:
            veda_verses = await db.veda_verses.find({
                "$or": [
                    {"text_sa": {"$regex": search_regex, "$options": "i"}},
                    {"transliteration": {"$regex": search_regex, "$options": "i"}},
                    {"meaning_hi": {"$regex": search_regex, "$options": "i"}},
                    {"meaning_en": {"$regex": search_regex, "$options": "i"}},
                ]
            }).limit(10).to_list(10)

            for v in veda_verses:
                chapter = await db.veda_chapters.find_one({"_id": ObjectId(v.get("chapter_id", ""))}) if v.get("chapter_id") else None
                book = await db.veda_books.find_one({"_id": ObjectId(v.get("book_id", ""))}) if v.get("book_id") else None
                book_name = (book.get("title_en", "") if book else "Unknown")
                ch_num = chapter.get("chapter_num", "?") if chapter else "?"
                meaning_obj = v.get("meaning", {})
                meaning_hi = meaning_obj.get("hi", v.get("meaning_hi", "")) if isinstance(meaning_obj, dict) else v.get("meaning_hi", "")
                meaning_en = meaning_obj.get("en", v.get("meaning_en", "")) if isinstance(meaning_obj, dict) else v.get("meaning_en", "")
                veda_results.append({
                    "book": book_name, "chapter": ch_num, "verse": v.get("verse_num"),
                    "sanskrit": v.get("text_sa", ""), "transliteration": v.get("transliteration", ""),
                    "meaning_hi": meaning_hi, "meaning_en": meaning_en,
                })

        # Search in content verses (Chalisa, Mantras, etc.)
        content_results = []
        if search_regex:
            content_verses = await db.content_verses.find({
                "$or": [
                    {"sanskrit_text": {"$regex": search_regex, "$options": "i"}},
                    {"transliteration": {"$regex": search_regex, "$options": "i"}},
                ]
            }).limit(10).to_list(10)

            for v in content_verses:
                item = await db.content_items.find_one({"_id": ObjectId(v.get("item_id", ""))}) if v.get("item_id") else None
                item_title = item.get("title_hi", item.get("title_en", "Unknown")) if item else "Unknown"
                meaning_doc = await db.verse_meanings.find_one({"verse_id": str(v["_id"]), "language": "hi"})
                content_results.append({
                    "book": item_title, "verse": v.get("verse_num"),
                    "sanskrit": v.get("sanskrit_text", ""), "transliteration": v.get("transliteration", ""),
                    "meaning_hi": meaning_doc.get("meaning", "") if meaning_doc else "",
                })

        # Search in knowledge base
        kb_results = []
        if search_regex:
            kb_entries = await db.vedachat_knowledge.find({
                "$or": [
                    {"text": {"$regex": search_regex, "$options": "i"}},
                    {"title": {"$regex": search_regex, "$options": "i"}},
                ]
            }).limit(5).to_list(5)
            for kb in kb_entries:
                kb_results.append({"source": kb.get("source_file", ""), "text": kb.get("text", "")[:500]})

        # Build context string
        all_refs = granth_results + veda_results + content_results
        if all_refs:
            scripture_context = "\n\n--- RELEVANT SCRIPTURES FROM DATABASE ---\n"
            for ref in all_refs[:15]:
                scripture_context += f"\n[{ref.get('book', 'Unknown')} | Chapter {ref.get('chapter', '?')} | Verse {ref.get('verse', '?')}]\n"
                if ref.get('sanskrit'):
                    scripture_context += f"Sanskrit: {ref['sanskrit']}\n"
                if ref.get('transliteration'):
                    scripture_context += f"Transliteration: {ref['transliteration']}\n"
                if ref.get('meaning_hi'):
                    scripture_context += f"Hindi Meaning: {ref['meaning_hi']}\n"
                if ref.get('meaning_en'):
                    scripture_context += f"English Meaning: {ref['meaning_en']}\n"

        if kb_results:
            scripture_context += "\n\n--- KNOWLEDGE BASE ---\n"
            for kb in kb_results:
                scripture_context += f"\n[Source: {kb['source']}]\n{kb['text']}\n"

    except Exception as search_err:
        logger.warning(f"VedaChat DB search error: {search_err}")
        scripture_context = ""

    # Call Claude with DB context
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        session_id = conversation_id or str(uuid.uuid4())
        system_msg = f"""You are VedaChat, a knowledgeable spiritual guide for Sanatan Dharma. You answer questions about Hindu scriptures, philosophy, rituals, and spiritual practices.

IMPORTANT RULES:
1. Always cite specific scripture references: Book Name, Chapter Number, Verse Number
2. When you reference a shloka, include the Sanskrit text AND its meaning
3. Use the RELEVANT SCRIPTURES FROM DATABASE section below as your primary source
4. If the database has matching verses, quote them exactly — do not paraphrase the Sanskrit
5. Format references clearly: [Book Name | Chapter X | Verse Y]
6. Respond in the language the user asks in (Hindi or English)
7. For each answer, try to include at least one direct shloka reference
8. Be helpful for both beginners and advanced practitioners

{scripture_context}"""

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"vedachat-{session_id}",
            system_message=system_msg
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Load last few messages for context (not full history to save tokens)
        recent_msgs = messages[-6:-1] if len(messages) > 6 else messages[:-1]
        for msg in recent_msgs:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))

        ai_response = await chat.send_message(UserMessage(text=message_text))

        # Extract references from the AI response and DB results
        extracted_refs = []
        for ref in (granth_results + veda_results + content_results)[:5]:
            extracted_refs.append({
                "book": ref.get("book", "Unknown"),
                "chapter": ref.get("chapter"),
                "chapter_name": ref.get("chapter_name", ""),
                "verse": ref.get("verse"),
                "sanskrit": ref.get("sanskrit", ""),
                "meaning": ref.get("meaning_hi") or ref.get("meaning_en", ""),
            })

        assistant_msg = {
            "role": "assistant",
            "content": ai_response,
            "references": extracted_refs,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        messages.append(assistant_msg)

    except Exception as e:
        logger.error(f"VedaChat AI error: {e}")
        assistant_msg = {
            "role": "assistant",
            "content": "I apologize, but I'm unable to process your question right now. Please try again later.",
            "references": [],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        messages.append(assistant_msg)

    # Save conversation
    if conv:
        await db.vedachat_conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"messages": messages, "last_message_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"conversation_id": conversation_id, "response": assistant_msg}
    else:
        new_conv = {
            "user_id": admin["_id"],
            "messages": messages,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_message_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.vedachat_conversations.insert_one(new_conv)
        return {"conversation_id": str(result.inserted_id), "response": assistant_msg}

@api_router.get("/vedachat/conversations")
async def list_conversations(request: Request):
    admin = await get_current_admin(request)
    convs = await db.vedachat_conversations.find({"user_id": admin["_id"]}).sort("last_message_at", -1).to_list(50)
    result = []
    for c in convs:
        doc = serialize_doc(c)
        doc["preview"] = c["messages"][0]["content"][:100] if c.get("messages") else ""
        doc["message_count"] = len(c.get("messages", []))
        result.append(doc)
    return result

@api_router.get("/vedachat/conversations/{conv_id}")
async def get_conversation(conv_id: str, request: Request):
    await get_current_admin(request)
    conv = await db.vedachat_conversations.find_one({"_id": ObjectId(conv_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return serialize_doc(conv)

@api_router.delete("/vedachat/conversations/{conv_id}")
async def delete_conversation(conv_id: str, request: Request):
    await get_current_admin(request)
    await db.vedachat_conversations.delete_one({"_id": ObjectId(conv_id)})
    return {"message": "Conversation deleted"}


@api_router.post("/vedachat/upload-knowledge")
async def vedachat_upload_knowledge(
    file: UploadFile = File(...),
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Upload PDF/DOCX to VedaChat knowledge base — parses content and saves to DB for accurate answers."""
    content_bytes = await file.read()
    fname = file.filename.lower()
    now = datetime.now(timezone.utc).isoformat()

    # Extract text
    raw_text = ""
    if fname.endswith(".pdf"):
        import pdfplumber, io
        with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    raw_text += text + "\n\n"
    elif fname.endswith((".docx", ".doc")):
        import io
        from docx import Document
        doc = Document(io.BytesIO(content_bytes))
        for para in doc.paragraphs:
            text = para.text
            if text.strip():
                style = para.style.name if para.style else ""
                is_bold = any(run.bold for run in para.runs if run.bold)
                if "Heading" in style or is_bold:
                    raw_text += f"\n[HEADING] {text}\n"
                else:
                    raw_text += f"{text}\n"
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files supported")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    # Parse with Claude to extract structured knowledge
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
        session_id=f"knowledge-{uuid.uuid4()}",
        system_message="""You are a Hindu scripture parser. Extract structured knowledge from this text.
Extract: Book/Source name, Chapters, Shlokas/Verses with:
- Original Sanskrit/Hindi text
- Transliteration
- Hindi meaning
- English meaning
- Chapter number, Verse number

Return ONLY valid JSON:
{
  "source": "detected book/source name",
  "chapters": [{
    "chapter_num": 1,
    "title": "chapter title",
    "verses": [{
      "verse_num": 1,
      "sanskrit": "verse text",
      "transliteration": "romanized text",
      "meaning_hi": "Hindi meaning",
      "meaning_en": "English meaning"
    }]
  }]
}

CRITICAL: Preserve ALL text. No truncation. No "..." placeholders."""
    )
    chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
    ai_resp = await chat.send_message(UserMessage(text=f"Parse:\n\n{raw_text[:50000]}"))

    import json as json_mod
    json_str = ai_resp
    if "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0]
    elif "```" in json_str:
        json_str = json_str.split("```")[1].split("```")[0]

    try:
        parsed = json_mod.loads(json_str.strip())
    except json_mod.JSONDecodeError:
        # Save raw text as knowledge even if parsing fails
        await db.vedachat_knowledge.insert_one({
            "source_file": file.filename,
            "title": file.filename,
            "text": raw_text[:50000],
            "type": "raw",
            "created_at": now,
            "created_by": admin["_id"],
        })
        return {"message": f"Saved raw text from {file.filename} to knowledge base (AI parsing partial)", "stats": {"chapters": 0, "verses": 0}}

    # Save structured data
    source_name = parsed.get("source", file.filename)
    chapters_saved = 0
    verses_saved = 0

    for ch_data in parsed.get("chapters", []):
        for v_data in ch_data.get("verses", []):
            await db.vedachat_knowledge.insert_one({
                "source_file": file.filename,
                "source_book": source_name,
                "title": f"{source_name} | Ch. {ch_data.get('chapter_num', '?')} | V. {v_data.get('verse_num', '?')}",
                "chapter_num": ch_data.get("chapter_num"),
                "chapter_title": ch_data.get("title", ""),
                "verse_num": v_data.get("verse_num"),
                "text": v_data.get("sanskrit", ""),
                "transliteration": v_data.get("transliteration", ""),
                "meaning_hi": v_data.get("meaning_hi", ""),
                "meaning_en": v_data.get("meaning_en", ""),
                "type": "verse",
                "created_at": now,
                "created_by": admin["_id"],
            })
            verses_saved += 1
        chapters_saved += 1

    # Log upload
    await db.upload_logs.insert_one({
        "admin_id": admin["_id"],
        "file_name": file.filename,
        "file_type": "knowledge_base",
        "status": "published",
        "parsed_items_count": verses_saved,
        "created_at": now,
    })

    return {
        "message": f"Parsed '{source_name}': {chapters_saved} chapters, {verses_saved} verses saved to knowledge base",
        "stats": {"chapters": chapters_saved, "verses": verses_saved, "source": source_name}
    }


@api_router.get("/vedachat/knowledge-stats")
async def vedachat_knowledge_stats(request: Request):
    """Get statistics about the VedaChat knowledge base."""
    await get_current_admin(request)
    kb_count = await db.vedachat_knowledge.count_documents({})
    granth_verses = await db.granth_verses.count_documents({})
    veda_verses = await db.veda_verses.count_documents({})
    content_verses = await db.content_verses.count_documents({})
    granth_books = await db.granth_books.count_documents({})
    veda_books = await db.veda_books.count_documents({})
    content_items = await db.content_items.count_documents({})

    return {
        "total_documents": kb_count,
        "total_verses": granth_verses + veda_verses + content_verses,
        "total_books": granth_books + veda_books,
        "total_content": content_items,
        "breakdown": {
            "knowledge_base": kb_count,
            "granth_verses": granth_verses,
            "veda_verses": veda_verses,
            "content_verses": content_verses,
        }
    }


# ===================== HOME / DISCOVERY =====================

@api_router.get("/home/today")
async def home_today():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    panchang = await db.panchang.find_one({"date": today})
    daily_shloka = await db.content_items.find_one({"status": "published"}, sort=[("sort_order", 1)])
    return {
        "greeting": "Om Namah Shivaya",
        "panchang": serialize_doc(panchang) if panchang else None,
        "daily_shloka": serialize_doc(daily_shloka) if daily_shloka else None,
        "date": today
    }

@api_router.get("/home/categories")
async def home_categories():
    return [
        {"key": "vedic_mantra", "title_hi": "वैदिक मंत्र", "title_en": "Vedic Mantras", "icon": "om"},
        {"key": "chalisa", "title_hi": "चालीसा", "title_en": "Chalisa", "icon": "book-open"},
        {"key": "ashtakam", "title_hi": "अष्टकम्", "title_en": "Ashtakam", "icon": "scroll"},
        {"key": "sahasranama", "title_hi": "सहस्रनाम", "title_en": "Sahasranama", "icon": "list"},
        {"key": "katha", "title_hi": "कथा एवं पूजा", "title_en": "Katha & Puja", "icon": "flame"},
        {"key": "arti", "title_hi": "आरती संग्रह", "title_en": "Arti Sangrah", "icon": "music"},
        {"key": "nama_ramayanam", "title_hi": "नाम रामायणम्", "title_en": "Nama Ramayanam", "icon": "heart"},
        {"key": "granth", "title_hi": "दिव्य ग्रंथ", "title_en": "Divya Granth", "icon": "library"}
    ]

@api_router.get("/search")
async def smart_search(q: str = "", lang: str = "hi", limit: int = 30):
    """Smart Search: Search across ALL scripture collections — returns Shloka + Book + Chapter + Verse + Meaning."""
    if not q or len(q) < 2:
        return {"results": [], "total": 0, "query": q}

    regex = {"$regex": q, "$options": "i"}
    results = []

    # 1. Search content items (Chalisa, Mantras, etc.)
    items = await db.content_items.find({"$or": [
        {"title_hi": regex}, {"title_en": regex}, {"title_sa": regex},
        {"deity": regex}, {"deity_hi": regex}, {"tags": regex}
    ]}).limit(5).to_list(5)
    for item in items:
        results.append({
            "type": "content_item",
            "source": item.get("category", ""),
            "title": item.get("title_hi", item.get("title_en", "")),
            "title_en": item.get("title_en", ""),
            "id": str(item["_id"]),
            "deity": item.get("deity", ""),
            "category": item.get("category", ""),
        })

    # 2. Search content verses (individual shlokas from Chalisa etc.)
    content_verses = await db.content_verses.find({"$or": [
        {"sanskrit_text": regex}, {"transliteration": regex}
    ]}).limit(8).to_list(8)
    for v in content_verses:
        item = await db.content_items.find_one({"_id": ObjectId(v.get("item_id", ""))}) if v.get("item_id") else None
        item_title = (item.get("title_hi", item.get("title_en", "")) if item else "Unknown")
        meaning_doc = await db.verse_meanings.find_one({"verse_id": str(v["_id"]), "language": lang})
        results.append({
            "type": "verse",
            "source": "bhakti",
            "book": item_title,
            "verse_num": v.get("verse_num"),
            "sanskrit": v.get("sanskrit_text", ""),
            "transliteration": v.get("transliteration", ""),
            "meaning": meaning_doc.get("meaning", "") if meaning_doc else "",
            "id": str(v["_id"]),
            "item_id": v.get("item_id", ""),
        })

    # 3. Search granth verses (Gita, Ramayana, etc.)
    granth_verses = await db.granth_verses.find({"$or": [
        {"sanskrit": regex}, {"transliteration": regex},
        {"meaning.hi": regex}, {"meaning.en": regex},
    ]}).limit(8).to_list(8)
    for v in granth_verses:
        chapter = await db.granth_chapters.find_one({"_id": ObjectId(v.get("chapter_id", ""))}) if v.get("chapter_id") else None
        book = await db.granth_books.find_one({"_id": ObjectId(v.get("book_id", ""))}) if v.get("book_id") else None
        book_name = (book.get("title_en", book.get("title", {}).get("en", "")) if book else "Unknown")
        book_name_hi = (book.get("title_hi", book.get("title", {}).get("hi", "")) if book else "")
        ch_num = chapter.get("chapter_num", "?") if chapter else "?"
        ch_name = (chapter.get("title_en", chapter.get("title", {}).get("en", "")) if chapter else "")
        meaning_obj = v.get("meaning", {})
        meaning = meaning_obj.get(lang, meaning_obj.get("hi", "")) if isinstance(meaning_obj, dict) else str(meaning_obj)
        results.append({
            "type": "verse",
            "source": "granth",
            "book": book_name,
            "book_hi": book_name_hi,
            "chapter": ch_num,
            "chapter_name": ch_name,
            "verse_num": v.get("verse_num"),
            "sanskrit": v.get("sanskrit", ""),
            "transliteration": v.get("transliteration", ""),
            "meaning": meaning,
            "id": str(v["_id"]),
        })

    # 4. Search veda verses
    veda_verses = await db.veda_verses.find({"$or": [
        {"text_sa": regex}, {"transliteration": regex},
        {"meaning_hi": regex}, {"meaning_en": regex},
    ]}).limit(8).to_list(8)
    for v in veda_verses:
        chapter = await db.veda_chapters.find_one({"_id": ObjectId(v.get("chapter_id", ""))}) if v.get("chapter_id") else None
        book = await db.veda_books.find_one({"_id": ObjectId(v.get("book_id", ""))}) if v.get("book_id") else None
        book_name = (book.get("title_en", "") if book else "Unknown")
        ch_num = chapter.get("chapter_num", "?") if chapter else "?"
        ch_name = (chapter.get("title_en", chapter.get("title", {}).get("en", "")) if chapter else "")
        meaning_obj = v.get("meaning", {})
        meaning = meaning_obj.get(lang, v.get(f"meaning_{lang}", v.get("meaning_hi", ""))) if isinstance(meaning_obj, dict) else v.get("meaning_hi", "")
        results.append({
            "type": "verse",
            "source": "vedas",
            "book": book_name,
            "chapter": ch_num,
            "chapter_name": ch_name,
            "verse_num": v.get("verse_num"),
            "sanskrit": v.get("text_sa", ""),
            "transliteration": v.get("transliteration", ""),
            "meaning": meaning,
            "id": str(v["_id"]),
        })

    # 5. Search knowledge base
    kb_results = await db.vedachat_knowledge.find({"$or": [
        {"text": regex}, {"meaning_hi": regex}, {"meaning_en": regex},
        {"source_book": regex}, {"transliteration": regex},
    ]}).limit(5).to_list(5)
    for kb in kb_results:
        results.append({
            "type": "verse",
            "source": "knowledge_base",
            "book": kb.get("source_book", kb.get("source_file", "")),
            "chapter": kb.get("chapter_num"),
            "verse_num": kb.get("verse_num"),
            "sanskrit": kb.get("text", ""),
            "transliteration": kb.get("transliteration", ""),
            "meaning": kb.get(f"meaning_{lang}", kb.get("meaning_hi", kb.get("meaning_en", ""))),
            "id": str(kb["_id"]),
        })

    return {"results": results[:limit], "total": len(results), "query": q, "language": lang}

# ===================== APP SETTINGS =====================

@api_router.get("/admin/settings")
async def get_settings(admin: dict = Depends(require_role(["super_admin"]))):
    settings = await db.app_settings.find({}).to_list(50)
    return [serialize_doc(s) for s in settings]

@api_router.put("/admin/settings/{key}")
async def update_setting(key: str, request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    await db.app_settings.update_one(
        {"key": key},
        {"$set": {"value": body.get("value"), "is_active": body.get("is_active", True), "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["_id"]}},
        upsert=True
    )
    return {"message": "Setting updated"}

# ===================== USERS (App Users) =====================

@api_router.get("/admin/users")
async def list_users(admin: dict = Depends(require_role(["super_admin", "content_admin"])), skip: int = 0, limit: int = 50):
    users = await db.user_profiles.find({}).skip(skip).limit(limit).to_list(limit)
    total = await db.user_profiles.count_documents({})
    return {"users": [serialize_doc(u) for u in users], "total": total}

# ===================== DAILY SHLOKA SCHEDULER =====================

@api_router.get("/admin/daily-schedule")
async def list_daily_schedules(admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    schedules = await db.daily_schedules.find({}).sort("date", -1).to_list(200)
    result = []
    for s in schedules:
        doc = serialize_doc(s)
        if s.get("content_id"):
            item = await db.content_items.find_one({"_id": ObjectId(s["content_id"])}, {"title_en": 1, "title_hi": 1, "category": 1})
            doc["content_item"] = serialize_doc(item) if item else None
        result.append(doc)
    return result

@api_router.post("/admin/daily-schedule")
async def create_daily_schedule(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    body["created_by"] = admin["_id"]
    result = await db.daily_schedules.insert_one(body)
    body["_id"] = str(result.inserted_id)
    return body

@api_router.put("/admin/daily-schedule/{schedule_id}")
async def update_daily_schedule(schedule_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    body.pop("content_item", None)
    await db.daily_schedules.update_one({"_id": ObjectId(schedule_id)}, {"$set": body})
    updated = await db.daily_schedules.find_one({"_id": ObjectId(schedule_id)})
    return serialize_doc(updated)

@api_router.delete("/admin/daily-schedule/{schedule_id}")
async def delete_daily_schedule(schedule_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.daily_schedules.delete_one({"_id": ObjectId(schedule_id)})
    return {"message": "Deleted"}

# Enhanced Home API with daily schedule, vrat, festival, nakshatra content
@api_router.get("/home/daily")
async def home_daily():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    day_of_week = datetime.now(timezone.utc).strftime("%A").lower()

    # Get panchang for today
    panchang = await db.panchang.find_one({"date": today})

    # Get daily scheduled shloka (date-specific first, then day-of-week)
    daily_schedule = await db.daily_schedules.find_one({"date": today, "is_active": True})
    if not daily_schedule:
        daily_schedule = await db.daily_schedules.find_one({"day_of_week": day_of_week, "schedule_type": "recurring", "is_active": True})

    daily_shloka = None
    if daily_schedule and daily_schedule.get("content_id"):
        daily_shloka = await db.content_items.find_one({"_id": ObjectId(daily_schedule["content_id"])})
        if daily_shloka:
            daily_shloka = serialize_doc(daily_shloka)

    if not daily_shloka:
        daily_shloka_doc = await db.content_items.find_one({"status": "published"}, sort=[("sort_order", 1)])
        if daily_shloka_doc:
            daily_shloka = serialize_doc(daily_shloka_doc)

    # Get vrat/festival info from panchang
    vrat_info = None
    festival_info = None
    nakshatra_content = []
    if panchang:
        if panchang.get("vrat_name"):
            vrat_info = {"name_hi": panchang.get("vrat_name", ""), "name_en": panchang.get("vrat_name_en", ""), "description": panchang.get("vrat_description", "")}
        if panchang.get("festival_name"):
            festival_info = {"name_hi": panchang.get("festival_name", ""), "name_en": panchang.get("festival_name_en", ""), "description": panchang.get("festival_description", "")}
        # Nakshatra-based content
        if panchang.get("nakshatra"):
            nakshatra_items = await db.content_items.find({"tags": {"$regex": panchang["nakshatra"], "$options": "i"}, "status": "published"}).limit(3).to_list(3)
            nakshatra_content = [serialize_doc(i) for i in nakshatra_items]

    # Linked content from panchang
    linked_content = []
    if panchang and panchang.get("linked_content_ids"):
        for cid in panchang["linked_content_ids"]:
            try:
                item = await db.content_items.find_one({"_id": ObjectId(cid)})
                if item:
                    linked_content.append(serialize_doc(item))
            except Exception:
                pass

    return {
        "date": today,
        "day_of_week": day_of_week,
        "greeting": "ॐ नमः शिवाय",
        "panchang": serialize_doc(panchang) if panchang else None,
        "daily_shloka": daily_shloka,
        "vrat": vrat_info,
        "festival": festival_info,
        "nakshatra_content": nakshatra_content,
        "linked_content": linked_content,
    }

# ===================== VRAT & FESTIVAL MANAGEMENT =====================

@api_router.get("/admin/vrat-festivals")
async def list_vrat_festivals(admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    items = await db.vrat_festivals.find({}).sort("date", 1).to_list(200)
    return [serialize_doc(i) for i in items]

@api_router.post("/admin/vrat-festivals")
async def create_vrat_festival(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.vrat_festivals.insert_one(body)
    body["_id"] = str(result.inserted_id)
    return body

@api_router.put("/admin/vrat-festivals/{item_id}")
async def update_vrat_festival(item_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    await db.vrat_festivals.update_one({"_id": ObjectId(item_id)}, {"$set": body})
    updated = await db.vrat_festivals.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)

@api_router.delete("/admin/vrat-festivals/{item_id}")
async def delete_vrat_festival(item_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.vrat_festivals.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}

# ===================== DOCX UPLOAD + CLAUDE PARSING =====================

@api_router.post("/admin/upload/docx")
async def upload_docx(file: UploadFile = File(...), category: str = Form("chalisa"), admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    if not file.filename.endswith(('.docx', '.DOCX')):
        raise HTTPException(status_code=400, detail="Only DOCX files are supported")

    content = await file.read()

    # Save upload log
    upload_log = {
        "admin_id": admin["_id"],
        "file_name": file.filename,
        "file_type": "docx",
        "category": category,
        "status": "parsing",
        "parsed_items_count": 0,
        "error_message": None,
        "parsed_data": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    log_result = await db.upload_logs.insert_one(upload_log)
    upload_id = str(log_result.inserted_id)

    # Extract text from DOCX with enhanced special character handling
    try:
        import io
        from docx import Document
        doc = Document(io.BytesIO(content))

        raw_text = ""
        for para in doc.paragraphs:
            style = para.style.name if para.style else "Normal"
            text = para.text  # Preserve original text with all special chars
            if not text.strip():
                raw_text += "\n"  # Preserve empty lines for verse separation
                continue
            is_bold = any(run.bold for run in para.runs if run.bold)
            is_italic = any(run.italic for run in para.runs if run.italic)
            # Detect Devanagari script
            devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
            has_devanagari = devanagari_count > len(text.strip()) * 0.3
            if "Heading 1" in style:
                raw_text += f"\n[H1] {text}\n"
            elif "Heading 2" in style:
                raw_text += f"\n[H2] {text}\n"
            elif "Heading 3" in style:
                raw_text += f"\n[H3] {text}\n"
            elif is_bold and has_devanagari:
                raw_text += f"[SANSKRIT] {text}\n"
            elif is_bold:
                raw_text += f"[BOLD] {text}\n"
            elif is_italic:
                raw_text += f"[TRANSLIT] {text}\n"
            else:
                raw_text += f"{text}\n"

        # Parse with Claude AI - Enhanced prompt for content integrity
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"docx-parse-{upload_id}",
            system_message="""You are a Hindu scripture content parser. Parse the uploaded text into structured JSON.

Rules:
- [H1] = Category name
- [H2] = Item title (extract Hindi and English names)
- [H3] = Section type (Doha, Chaupai, Shloka, etc.)
- [SANSKRIT] = Sanskrit/Hindi verse text - preserve ALL special characters (anusvara, visarga, chandrabindu, halant)
- [BOLD] = Section header or emphasis
- [TRANSLIT] = Transliteration
- Normal text after verse = Hindi meaning

CRITICAL RULES:
1. Preserve 100% of text. NEVER truncate. NEVER use "..." or "names continue" placeholders.
2. For Namavali, include ALL 108 or 1008 names - every single one.
3. Preserve line breaks within verses using \\n character.
4. Preserve all diacritical marks and special Unicode characters.
5. Sanskrit special chars to preserve: anusvara (ं), visarga (ः), chandrabindu (ँ), halant (्), nukta (़)

Return ONLY valid JSON array:
[{
  "title_hi": "हनुमान चालीसा",
  "title_en": "Hanuman Chalisa",
  "deity": "Hanuman",
  "deity_hi": "हनुमान",
  "description_en": "brief description",
  "description_hi": "brief description in Hindi",
  "verses": [{
    "verse_num": 1,
    "verse_type": "doha|chaupai|shloka|mantra|stanza|name",
    "sanskrit_text": "COMPLETE verse text with \\n for line breaks",
    "transliteration": "transliteration if available",
    "meaning_hi": "Hindi meaning if available",
    "meaning_en": "English meaning if available"
  }]
}]"""
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")

        ai_response = await chat.send_message(UserMessage(text=f"Parse this scripture content for category '{category}':\n\n{raw_text}"))

        # Extract JSON from response
        import json
        json_str = ai_response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]

        parsed_data = json.loads(json_str.strip())

        await db.upload_logs.update_one(
            {"_id": ObjectId(upload_id)},
            {"$set": {"status": "parsed", "parsed_data": parsed_data, "parsed_items_count": len(parsed_data)}}
        )

        return {"upload_id": upload_id, "status": "parsed", "items_count": len(parsed_data), "parsed_data": parsed_data}

    except json.JSONDecodeError as e:
        await db.upload_logs.update_one(
            {"_id": ObjectId(upload_id)},
            {"$set": {"status": "error", "error_message": f"AI parsing returned invalid JSON: {str(e)}"}}
        )
        return {"upload_id": upload_id, "status": "error", "error": f"JSON parse error: {str(e)}", "raw_response": ai_response[:500] if 'ai_response' in dir() else ""}
    except Exception as e:
        logger.error(f"DOCX parsing error: {e}")
        await db.upload_logs.update_one(
            {"_id": ObjectId(upload_id)},
            {"$set": {"status": "error", "error_message": str(e)}}
        )
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

@api_router.post("/admin/upload/publish/{upload_id}")
async def publish_upload(upload_id: str, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    upload = await db.upload_logs.find_one({"_id": ObjectId(upload_id)})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    if upload["status"] != "parsed":
        raise HTTPException(status_code=400, detail="Upload not parsed yet")

    parsed_data = upload.get("parsed_data", [])
    category = upload.get("category", "chalisa")
    published_count = 0

    for item_data in parsed_data:
        slug = item_data.get("title_en", "untitled").lower().replace(" ", "-").replace("'", "")
        content_doc = {
            "category": category,
            "slug": slug,
            "title_hi": item_data.get("title_hi", ""),
            "title_en": item_data.get("title_en", ""),
            "deity": item_data.get("deity", ""),
            "deity_hi": item_data.get("deity_hi", ""),
            "description_hi": item_data.get("description_hi", ""),
            "description_en": item_data.get("description_en", ""),
            "thumbnail_url": "",
            "audio_url": "",
            "has_beginner_mode": True,
            "has_expert_mode": True,
            "total_verses": len(item_data.get("verses", [])),
            "sort_order": published_count + 1,
            "is_active": True,
            "is_premium": False,
            "tags": [],
            "supported_languages": ["hi", "en", "sa"],
            "like_count": 0,
            "status": "published",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin["_id"]
        }
        result = await db.content_items.insert_one(content_doc)
        item_id = str(result.inserted_id)

        for verse in item_data.get("verses", []):
            verse_doc = {
                "item_id": item_id,
                "verse_num": verse.get("verse_num", 1),
                "verse_type": verse.get("verse_type", "shloka"),
                "sanskrit_text": verse.get("sanskrit_text", ""),
                "transliteration": verse.get("transliteration", ""),
                "sort_order": verse.get("verse_num", 1),
                "is_active": True,
                "audio_start_ms": 0,
                "audio_end_ms": 0
            }
            v_result = await db.content_verses.insert_one(verse_doc)
            verse_id = str(v_result.inserted_id)

            if verse.get("meaning_hi"):
                await db.verse_meanings.insert_one({"verse_id": verse_id, "language": "hi", "meaning": verse["meaning_hi"], "word_breakdown": []})
            if verse.get("meaning_en"):
                await db.verse_meanings.insert_one({"verse_id": verse_id, "language": "en", "meaning": verse["meaning_en"], "word_breakdown": []})

        published_count += 1

    await db.upload_logs.update_one(
        {"_id": ObjectId(upload_id)},
        {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": f"Published {published_count} items", "count": published_count}

@api_router.get("/admin/uploads")
async def list_uploads(admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    uploads = await db.upload_logs.find({}, {"parsed_data": 0}).sort("created_at", -1).to_list(100)
    return [serialize_doc(u) for u in uploads]

@api_router.get("/admin/uploads/{upload_id}")
async def get_upload(upload_id: str, admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    upload = await db.upload_logs.find_one({"_id": ObjectId(upload_id)})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return serialize_doc(upload)

# ===================== TTS AUDIO GENERATION =====================

@api_router.post("/media/generate-tts")
async def generate_tts(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    text = body.get("text", "")
    voice = body.get("voice", "echo")
    model = body.get("model", "tts-1")
    verse_id = body.get("verse_id")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 4096:
        raise HTTPException(status_code=400, detail="Text too long (max 4096 chars)")

    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        import base64

        tts = OpenAITextToSpeech(api_key=os.environ.get("EMERGENT_LLM_KEY", ""))
        audio_bytes = await tts.generate_speech(text=text, model=model, voice=voice, response_format="mp3")

        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        # If verse_id provided, save reference
        if verse_id:
            await db.content_verses.update_one(
                {"_id": ObjectId(verse_id)},
                {"$set": {"tts_audio_base64": audio_base64[:100] + "...", "tts_voice": voice, "tts_generated_at": datetime.now(timezone.utc).isoformat()}}
            )

        return {
            "audio_base64": audio_base64,
            "format": "mp3",
            "voice": voice,
            "model": model,
            "text_length": len(text)
        }
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

# ===================== BATCH TTS & AUDIO MANAGEMENT =====================

@api_router.post("/media/batch-tts/{item_id}")
async def batch_generate_tts(item_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    """Generate TTS audio for ALL verses in a content item"""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    voice = body.get("voice", "echo")
    model = body.get("model", "tts-1")

    item = await db.content_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    verses = await db.content_verses.find({"item_id": item_id}).sort("sort_order", 1).to_list(500)
    if not verses:
        raise HTTPException(status_code=404, detail="No verses found")

    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        import base64

        tts = OpenAITextToSpeech(api_key=os.environ.get("EMERGENT_LLM_KEY", ""))
        generated = 0
        errors = []

        for verse in verses:
            text = verse.get("sanskrit_text", "")
            if not text or len(text) < 2:
                continue
            # Skip if already has audio
            if verse.get("audio_base64"):
                continue

            try:
                audio_bytes = await tts.generate_speech(text=text[:4096], model=model, voice=voice, response_format="mp3")
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

                await db.content_verses.update_one(
                    {"_id": verse["_id"]},
                    {"$set": {
                        "audio_base64": audio_b64,
                        "tts_voice": voice,
                        "tts_model": model,
                        "tts_generated_at": datetime.now(timezone.utc).isoformat(),
                        "audio_duration_ms": len(audio_bytes) * 8 // 128  # rough estimate for mp3
                    }}
                )
                generated += 1
                logger.info(f"TTS generated for verse {verse.get('verse_num')} of {item.get('title_en')}")
            except Exception as e:
                errors.append(f"Verse {verse.get('verse_num')}: {str(e)[:100]}")
                logger.error(f"TTS error for verse {verse.get('verse_num')}: {e}")

        # Update item with audio status
        await db.content_items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"has_tts_audio": True, "tts_voice": voice, "audio_generated_at": datetime.now(timezone.utc).isoformat()}}
        )

        await log_audit("batch_tts_generated", admin_id=admin["_id"], admin_email=admin.get("email"), ip=admin.get("_ip", ""), details={"item_id": item_id, "title": item.get("title_en"), "generated": generated, "errors": len(errors)})

        return {"message": f"Generated TTS for {generated} verses", "generated": generated, "total_verses": len(verses), "errors": errors}
    except Exception as e:
        logger.error(f"Batch TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch TTS failed: {str(e)}")

@api_router.get("/content/items/{item_id}/verses-with-audio")
async def get_verses_with_audio(item_id: str):
    """Get verses with audio data for the audio player"""
    verses = await db.content_verses.find({"item_id": item_id}).sort("sort_order", 1).to_list(500)
    result = []
    for v in verses:
        doc = serialize_doc(v)
        doc["has_audio"] = bool(v.get("audio_base64"))
        # Don't send full base64 in list — use separate endpoint
        doc.pop("audio_base64", None)
        result.append(doc)
    return result

@api_router.get("/content/verses/{verse_id}/audio")
async def get_verse_audio(verse_id: str):
    """Get audio data for a single verse"""
    verse = await db.content_verses.find_one({"_id": ObjectId(verse_id)})
    if not verse:
        raise HTTPException(status_code=404, detail="Verse not found")
    if not verse.get("audio_base64"):
        raise HTTPException(status_code=404, detail="No audio available for this verse")
    return {
        "verse_id": verse_id,
        "audio_base64": verse["audio_base64"],
        "format": "mp3",
        "voice": verse.get("tts_voice", "echo"),
        "verse_num": verse.get("verse_num"),
        "duration_ms": verse.get("audio_duration_ms", 0)
    }

@api_router.get("/content/items/{item_id}/full-audio")
async def get_item_full_audio(item_id: str):
    """Get all verse audio for continuous playback"""
    verses = await db.content_verses.find({"item_id": item_id, "audio_base64": {"$exists": True, "$ne": ""}}).sort("sort_order", 1).to_list(500)
    result = []
    for v in verses:
        result.append({
            "verse_id": str(v["_id"]),
            "verse_num": v.get("verse_num"),
            "sanskrit_text": v.get("sanskrit_text", ""),
            "audio_base64": v.get("audio_base64", ""),
            "duration_ms": v.get("audio_duration_ms", 0),
        })
    return {"item_id": item_id, "verses": result, "total": len(result)}

# ===================== USER AUTH (Mobile App) =====================

# MSG91 User Existence Validation API
# MSG91 calls this GET endpoint before sending OTP to validate if user/phone exists
@api_router.get("/auth/user/exists/{identifier}")
async def check_user_exists(identifier: str):
    """MSG91 User Existence Validation API.
    MSG91 sends GET request with phone number as path param.
    Must return: {"user_found": true/false, "identifier": "phone_or_email"}
    """
    if not identifier:
        return {"user_found": False, "identifier": ""}

    # Clean phone number
    phone = identifier.strip().replace(" ", "").replace("-", "")

    user = await db.user_profiles.find_one({
        "$or": [
            {"phone": phone},
            {"phone": f"+91{phone}"} if not phone.startswith("+") else {"phone": phone},
            {"email": identifier.lower()}
        ]
    })

    if user:
        return {
            "user_found": True,
            "identifier": user.get("phone") or user.get("email", identifier)
        }
    else:
        return {
            "user_found": True,
            "identifier": identifier
        }

class UserRegisterReq(BaseModel):
    phone: str
    name: str = ""
    language_pref: str = "hi"

class UserOTPVerifyReq(BaseModel):
    phone: str
    otp: str

class UserGoogleAuthReq(BaseModel):
    email: str
    name: str
    avatar_url: str = ""

@api_router.post("/auth/user/send-otp")
async def send_otp(req: UserRegisterReq):
    # Generate 6-digit OTP
    import random
    otp = str(random.randint(100000, 999999))

    # Store OTP in DB (expires in 5 min)
    await db.otp_store.update_one(
        {"phone": req.phone},
        {"$set": {"otp": otp, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(), "attempts": 0}},
        upsert=True
    )

    # Try sending via MSG91 if configured
    msg91_auth_key = await get_setting("msg91_auth_key")
    msg91_template_id = await get_setting("msg91_template_id")
    if msg91_auth_key and msg91_template_id:
        try:
            import requests as http_requests
            phone = req.phone if req.phone.startswith("+") else f"+91{req.phone}"
            resp = http_requests.post(
                "https://control.msg91.com/api/v5/otp",
                headers={"authkey": msg91_auth_key, "Content-Type": "application/json"},
                json={"template_id": msg91_template_id, "mobile": phone.replace("+", ""), "otp": otp}
            )
            logger.info(f"MSG91 OTP response: {resp.status_code}")
            return {"message": "OTP sent via SMS", "sent_via": "msg91"}
        except Exception as e:
            logger.error(f"MSG91 error: {e}")

    logger.info(f"OTP for {req.phone}: {otp}")
    return {"message": "OTP sent successfully", "debug_otp": otp}

@api_router.post("/auth/user/verify-otp")
async def verify_otp(req: UserOTPVerifyReq, response: Response):
    stored = await db.otp_store.find_one({"phone": req.phone})
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
    if stored.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new OTP.")
    if stored["otp"] != req.otp:
        await db.otp_store.update_one({"phone": req.phone}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # OTP valid - find or create user
    user = await db.user_profiles.find_one({"phone": req.phone})
    if not user:
        user_doc = {
            "phone": req.phone,
            "name": "",
            "email": "",
            "avatar_url": "",
            "language_pref": "hi",
            "mode_pref": "beginner",
            "is_premium": False,
            "streak_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_active_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.user_profiles.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc

    user_id = str(user["_id"])
    access_token = jwt.encode(
        {"sub": user_id, "phone": req.phone, "type": "access", "role": "user", "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

    # Clean up OTP
    await db.otp_store.delete_one({"phone": req.phone})

    return {"token": access_token, "user": serialize_doc(user)}

# MSG91 Widget Token Verification — After OTP verified on mobile via MSG91 widget
@api_router.post("/auth/user/msg91-verify")
async def msg91_widget_verify(request: Request, response: Response):
    body = await request.json()
    phone = body.get("phone", "")
    msg91_token = body.get("msg91_token", "")

    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")

    # If MSG91 token provided, verify with MSG91 server
    if msg91_token:
        msg91_auth_key = await get_setting("msg91_auth_key")
        if msg91_auth_key:
            try:
                import requests as http_requests
                verify_resp = http_requests.get(
                    f"https://control.msg91.com/api/v5/otp/verify?otp={msg91_token}&mobile={phone.replace('+', '')}",
                    headers={"authkey": msg91_auth_key}
                )
                if verify_resp.status_code != 200 or verify_resp.json().get("type") != "success":
                    raise HTTPException(status_code=400, detail="MSG91 token verification failed")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"MSG91 verify error: {e}")

    # Clean phone
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    if not clean_phone.startswith("+"):
        clean_phone = f"+91{clean_phone}"

    # Find or create user
    user = await db.user_profiles.find_one({"$or": [{"phone": clean_phone}, {"phone": phone}]})
    if not user:
        user_doc = {
            "phone": clean_phone,
            "name": body.get("name", ""),
            "email": "",
            "avatar_url": "",
            "language_pref": "hi",
            "mode_pref": "beginner",
            "is_premium": False,
            "streak_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_active_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.user_profiles.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc
    else:
        await db.user_profiles.update_one({"_id": user["_id"]}, {"$set": {"last_active_at": datetime.now(timezone.utc).isoformat()}})

    user_id = str(user["_id"])
    access_token = jwt.encode(
        {"sub": user_id, "phone": clean_phone, "type": "access", "role": "user", "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

    await log_audit("user_login_otp", details={"phone": clean_phone, "method": "msg91_widget"})
    return {"token": access_token, "user": serialize_doc(user)}

@api_router.post("/auth/user/google")
async def google_auth(req: UserGoogleAuthReq, response: Response):
    user = await db.user_profiles.find_one({"email": req.email})
    if not user:
        user_doc = {
            "phone": "",
            "name": req.name,
            "email": req.email,
            "avatar_url": req.avatar_url,
            "language_pref": "hi",
            "mode_pref": "beginner",
            "is_premium": False,
            "streak_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_active_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.user_profiles.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user = user_doc
    else:
        await db.user_profiles.update_one({"_id": user["_id"]}, {"$set": {"last_active_at": datetime.now(timezone.utc).isoformat(), "name": req.name}})

    user_id = str(user["_id"])
    access_token = jwt.encode(
        {"sub": user_id, "email": req.email, "type": "access", "role": "user", "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

    return {"token": access_token, "user": serialize_doc(user)}

# ===================== PDF UPLOAD + VEDAS PARSING =====================

@api_router.post("/admin/upload/pdf")
async def upload_pdf(file: UploadFile = File(...), book_type: str = Form("veda"), admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    if not file.filename.endswith(('.pdf', '.PDF')):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    upload_log = {
        "admin_id": admin["_id"], "file_name": file.filename, "file_type": "pdf",
        "category": book_type, "status": "parsing", "parsed_items_count": 0,
        "error_message": None, "parsed_data": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    log_result = await db.upload_logs.insert_one(upload_log)
    upload_id = str(log_result.inserted_id)

    try:
        import io, pdfplumber, json
        raw_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for i, page in enumerate(pdf.pages[:50]):
                text = page.extract_text()
                if text:
                    raw_text += f"\n--- Page {i+1} ---\n{text}\n"

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="No text found in PDF")

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"pdf-parse-{upload_id}",
            system_message="""You are a Vedic scripture parser. Extract structured content from PDF text.
Return ONLY valid JSON:
{
  "book_title_hi": "ऋग्वेद",
  "book_title_en": "Rig Veda",
  "description_en": "brief description",
  "chapters": [{
    "chapter_num": 1,
    "title_hi": "प्रथम मण्डल",
    "title_en": "First Mandala",
    "verses": [{
      "verse_num": 1,
      "text_sa": "Sanskrit text",
      "transliteration": "transliteration",
      "meaning_hi": "Hindi meaning",
      "meaning_en": "English meaning"
    }]
  }]
}"""
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        ai_response = await chat.send_message(UserMessage(text=f"Parse this Vedic/Puranic PDF text into structured chapters and verses:\n\n{raw_text[:15000]}"))

        json_str = ai_response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        parsed_data = json.loads(json_str.strip())

        total_verses = sum(len(ch.get("verses", [])) for ch in parsed_data.get("chapters", []))
        await db.upload_logs.update_one(
            {"_id": ObjectId(upload_id)},
            {"$set": {"status": "parsed", "parsed_data": parsed_data, "parsed_items_count": total_verses}}
        )
        return {"upload_id": upload_id, "status": "parsed", "parsed_data": parsed_data, "total_chapters": len(parsed_data.get("chapters", [])), "total_verses": total_verses}

    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        await db.upload_logs.update_one({"_id": ObjectId(upload_id)}, {"$set": {"status": "error", "error_message": str(e)}})
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")

@api_router.post("/admin/upload/pdf/publish/{upload_id}")
async def publish_pdf_upload(upload_id: str, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    upload = await db.upload_logs.find_one({"_id": ObjectId(upload_id)})
    if not upload or upload["status"] != "parsed":
        raise HTTPException(status_code=400, detail="Upload not found or not parsed")

    parsed = upload.get("parsed_data", {})
    book_doc = {
        "title_hi": parsed.get("book_title_hi", ""), "title_en": parsed.get("book_title_en", ""),
        "category": upload.get("category", "veda"), "description_en": parsed.get("description_en", ""),
        "description_hi": parsed.get("description_hi", ""),
        "total_chapters": len(parsed.get("chapters", [])),
        "sort_order": 10, "is_active": True, "parsing_status": "completed"
    }
    book_result = await db.veda_books.insert_one(book_doc)
    book_id = str(book_result.inserted_id)

    for ch in parsed.get("chapters", []):
        ch_doc = {"book_id": book_id, "chapter_num": ch.get("chapter_num", 1), "title_hi": ch.get("title_hi", ""), "title_en": ch.get("title_en", ""), "total_verses": len(ch.get("verses", [])), "sort_order": ch.get("chapter_num", 1)}
        ch_result = await db.veda_chapters.insert_one(ch_doc)
        ch_id = str(ch_result.inserted_id)
        for v in ch.get("verses", []):
            await db.veda_verses.insert_one({"chapter_id": ch_id, "verse_num": v.get("verse_num", 1), "text_sa": v.get("text_sa", ""), "transliteration": v.get("transliteration", ""), "meaning_hi": v.get("meaning_hi", ""), "meaning_en": v.get("meaning_en", ""), "sort_order": v.get("verse_num", 1)})

    await db.upload_logs.update_one({"_id": ObjectId(upload_id)}, {"$set": {"status": "published"}})
    return {"message": "Published", "book_id": book_id}

# ===================== PANCHANG PDF IMPORT =====================

@api_router.post("/admin/panchang/import-pdf")
async def import_panchang_pdf(file: UploadFile = File(...), admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    content = await file.read()
    try:
        import io, pdfplumber, json
        raw_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:100]:
                text = page.extract_text()
                if text:
                    raw_text += text + "\n"

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"panchang-import-{uuid.uuid4()}",
            system_message="""Extract Hindu Panchang calendar data from this PDF. Return ONLY valid JSON array:
[{
  "date": "YYYY-MM-DD",
  "tithi": "तिथि name in Hindi",
  "nakshatra": "नक्षत्र name in Hindi",
  "yoga": "योग name in Hindi",
  "karana": "करण name",
  "sunrise": "HH:MM",
  "sunset": "HH:MM",
  "rahu_kaal": "HH:MM-HH:MM",
  "festival_name": "festival in Hindi (empty if none)",
  "festival_name_en": "festival in English",
  "vrat_name": "vrat in Hindi (empty if none)",
  "vrat_name_en": "vrat in English",
  "is_panchak": false,
  "is_bhadra": false
}]
Extract as many dates as possible from the PDF."""
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        ai_response = await chat.send_message(UserMessage(text=f"Extract panchang data:\n\n{raw_text[:15000]}"))

        json_str = ai_response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        entries = json.loads(json_str.strip())

        imported = 0
        for entry in entries:
            if entry.get("date"):
                await db.panchang.update_one({"date": entry["date"]}, {"$set": entry}, upsert=True)
                imported += 1

        return {"message": f"Imported {imported} panchang entries", "count": imported, "entries": entries[:5]}
    except Exception as e:
        logger.error(f"Panchang PDF import error: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# ===================== KATHA CHAPTERS/VERSES CRUD =====================

@api_router.get("/katha/items/{katha_id}/chapters")
async def get_katha_chapters(katha_id: str):
    chapters = await db.katha_verses.find({"katha_id": katha_id}).sort("chapter_num", 1).to_list(500)
    return [serialize_doc(c) for c in chapters]

@api_router.post("/katha/items/{katha_id}/chapters")
async def create_katha_chapter(katha_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body["katha_id"] = katha_id
    result = await db.katha_verses.insert_one(body)
    body["_id"] = str(result.inserted_id)
    return body

@api_router.put("/katha/verses/{verse_id}")
async def update_katha_verse(verse_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    await db.katha_verses.update_one({"_id": ObjectId(verse_id)}, {"$set": body})
    updated = await db.katha_verses.find_one({"_id": ObjectId(verse_id)})
    return serialize_doc(updated)

@api_router.delete("/katha/verses/{verse_id}")
async def delete_katha_verse(verse_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.katha_verses.delete_one({"_id": ObjectId(verse_id)})
    return {"message": "Deleted"}

# ===================== SHLOKA CARD IMAGE GENERATION (Nano Banana) =====================

@api_router.post("/media/generate-image")
async def generate_shloka_image(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    prompt = body.get("prompt", "")
    shloka_text = body.get("shloka_text", "")

    if not prompt and not shloka_text:
        raise HTTPException(status_code=400, detail="Prompt or shloka text required")

    full_prompt = prompt if prompt else f"Create a beautiful, ornate Indian spiritual art card background for this Sanskrit shloka: '{shloka_text[:200]}'. Use traditional Hindu temple art style with warm saffron, gold and deep red colors. Include decorative borders with lotus, Om symbols and sacred geometry patterns. The background should be elegant and suitable for text overlay."

    try:
        import base64
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"img-gen-{uuid.uuid4()}",
            system_message="You are an AI image generator creating beautiful Hindu spiritual art."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

        msg = UserMessage(text=full_prompt)
        text_resp, images = await chat.send_message_multimodal_response(msg)

        if images and len(images) > 0:
            return {
                "image_base64": images[0]["data"],
                "mime_type": images[0].get("mime_type", "image/png"),
                "prompt_used": full_prompt[:200],
                "text_response": text_resp[:200] if text_resp else ""
            }
        else:
            return {"error": "No image generated", "text_response": text_resp[:500] if text_resp else ""}
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

# ===================== VIDEO GENERATION (Sora 2) =====================

@api_router.post("/media/generate-video")
async def generate_video(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    prompt = body.get("prompt", "")
    size = body.get("size", "1280x720")
    duration = body.get("duration", 4)
    model = body.get("model", "sora-2")

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    if size not in ["1280x720", "1792x1024", "1024x1792", "1024x1024"]:
        raise HTTPException(status_code=400, detail="Invalid size")
    if duration not in [4, 8, 12]:
        raise HTTPException(status_code=400, detail="Duration must be 4, 8, or 12")

    try:
        import asyncio, base64
        from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration

        video_gen = OpenAIVideoGeneration(api_key=os.environ.get("EMERGENT_LLM_KEY", ""))

        # Run sync video generation in thread executor
        loop = asyncio.get_event_loop()
        video_bytes = await loop.run_in_executor(
            None,
            lambda: video_gen.text_to_video(prompt=prompt, model=model, size=size, duration=duration, max_wait_time=600)
        )

        if video_bytes:
            video_base64 = base64.b64encode(video_bytes).decode("utf-8")

            # Save to user videos collection
            video_doc = {
                "user_id": admin["_id"],
                "prompt": prompt,
                "model": model,
                "size": size,
                "duration": duration,
                "video_base64_preview": video_base64[:100],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.user_videos.insert_one(video_doc)

            return {
                "video_base64": video_base64,
                "format": "mp4",
                "prompt": prompt,
                "size": size,
                "duration": duration,
                "model": model
            }
        else:
            raise HTTPException(status_code=500, detail="Video generation returned no data")
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

# ===================== NAKSHATRA & UPAYA (Personalized Spiritual) =====================

NAKSHATRAS = [
    {"num": 1, "name_hi": "अश्विनी", "name_en": "Ashwini", "deity": "Ashwini Kumaras", "graha": "Ketu"},
    {"num": 2, "name_hi": "भरणी", "name_en": "Bharani", "deity": "Yama", "graha": "Venus"},
    {"num": 3, "name_hi": "कृत्तिका", "name_en": "Krittika", "deity": "Agni", "graha": "Sun"},
    {"num": 4, "name_hi": "रोहिणी", "name_en": "Rohini", "deity": "Brahma", "graha": "Moon"},
    {"num": 5, "name_hi": "मृगशीर्ष", "name_en": "Mrigashira", "deity": "Soma", "graha": "Mars"},
    {"num": 6, "name_hi": "आर्द्रा", "name_en": "Ardra", "deity": "Rudra", "graha": "Rahu"},
    {"num": 7, "name_hi": "पुनर्वसु", "name_en": "Punarvasu", "deity": "Aditi", "graha": "Jupiter"},
    {"num": 8, "name_hi": "पुष्य", "name_en": "Pushya", "deity": "Brihaspati", "graha": "Saturn"},
    {"num": 9, "name_hi": "आश्लेषा", "name_en": "Ashlesha", "deity": "Nagas", "graha": "Mercury"},
    {"num": 10, "name_hi": "मघा", "name_en": "Magha", "deity": "Pitrs", "graha": "Ketu"},
    {"num": 11, "name_hi": "पूर्व फाल्गुनी", "name_en": "Purva Phalguni", "deity": "Bhaga", "graha": "Venus"},
    {"num": 12, "name_hi": "उत्तर फाल्गुनी", "name_en": "Uttara Phalguni", "deity": "Aryaman", "graha": "Sun"},
    {"num": 13, "name_hi": "हस्त", "name_en": "Hasta", "deity": "Savitar", "graha": "Moon"},
    {"num": 14, "name_hi": "चित्रा", "name_en": "Chitra", "deity": "Vishwakarma", "graha": "Mars"},
    {"num": 15, "name_hi": "स्वाती", "name_en": "Swati", "deity": "Vayu", "graha": "Rahu"},
    {"num": 16, "name_hi": "विशाखा", "name_en": "Vishakha", "deity": "Indra-Agni", "graha": "Jupiter"},
    {"num": 17, "name_hi": "अनुराधा", "name_en": "Anuradha", "deity": "Mitra", "graha": "Saturn"},
    {"num": 18, "name_hi": "ज्येष्ठा", "name_en": "Jyeshtha", "deity": "Indra", "graha": "Mercury"},
    {"num": 19, "name_hi": "मूल", "name_en": "Mula", "deity": "Nirrti", "graha": "Ketu"},
    {"num": 20, "name_hi": "पूर्वाषाढ़ा", "name_en": "Purva Ashadha", "deity": "Apah", "graha": "Venus"},
    {"num": 21, "name_hi": "उत्तराषाढ़ा", "name_en": "Uttara Ashadha", "deity": "Vishvedevas", "graha": "Sun"},
    {"num": 22, "name_hi": "श्रवण", "name_en": "Shravana", "deity": "Vishnu", "graha": "Moon"},
    {"num": 23, "name_hi": "धनिष्ठा", "name_en": "Dhanishta", "deity": "Vasus", "graha": "Mars"},
    {"num": 24, "name_hi": "शतभिषा", "name_en": "Shatabhisha", "deity": "Varuna", "graha": "Rahu"},
    {"num": 25, "name_hi": "पूर्व भाद्रपद", "name_en": "Purva Bhadrapada", "deity": "Aja Ekapada", "graha": "Jupiter"},
    {"num": 26, "name_hi": "उत्तर भाद्रपद", "name_en": "Uttara Bhadrapada", "deity": "Ahir Budhnya", "graha": "Saturn"},
    {"num": 27, "name_hi": "रेवती", "name_en": "Revati", "deity": "Pushan", "graha": "Mercury"},
]

@api_router.get("/nakshatras")
async def list_nakshatras():
    return NAKSHATRAS

@api_router.post("/user/nakshatra-profile")
async def set_nakshatra_profile(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    nakshatra_num = body.get("nakshatra_num")
    dob = body.get("dob", "")
    birth_time = body.get("birth_time", "")
    birth_place = body.get("birth_place", "")

    if not user_id or not nakshatra_num:
        raise HTTPException(status_code=400, detail="user_id and nakshatra_num required")

    nakshatra = next((n for n in NAKSHATRAS if n["num"] == nakshatra_num), None)
    if not nakshatra:
        raise HTTPException(status_code=400, detail="Invalid nakshatra number")

    profile = {
        "user_id": user_id,
        "nakshatra_num": nakshatra_num,
        "nakshatra_name_hi": nakshatra["name_hi"],
        "nakshatra_name_en": nakshatra["name_en"],
        "ruling_graha": nakshatra["graha"],
        "nakshatra_deity": nakshatra["deity"],
        "dob": dob,
        "birth_time": birth_time,
        "birth_place": birth_place,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.nakshatra_profiles.update_one({"user_id": user_id}, {"$set": profile}, upsert=True)
    return profile

@api_router.get("/user/nakshatra-profile/{user_id}")
async def get_nakshatra_profile(user_id: str):
    profile = await db.nakshatra_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.post("/user/upaya")
async def get_personalized_upaya(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    concern = body.get("concern", "general wellbeing")

    profile = await db.nakshatra_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Nakshatra profile not set. Please set your birth details first.")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"upaya-{uuid.uuid4()}",
            system_message="""You are a Vedic astrology expert. Provide personalized spiritual remedies (Upaya) based on the user's Nakshatra and birth details.

Include in your response:
1. Graha Shanti (planetary remedy) - specific mantras and puja
2. Recommended daily mantras based on their ruling planet
3. Specific deity worship recommendations
4. Fasting days (Vrat) beneficial for their nakshatra
5. Gemstone recommendation
6. Charitable acts (Daan) recommendations
7. Any specific puja vidhi for their concern

Respond in both Hindi and English. Be specific with mantra texts in Sanskrit."""
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")

        prompt = f"""Generate personalized Upaya (spiritual remedies) for:
- Nakshatra: {profile['nakshatra_name_en']} ({profile['nakshatra_name_hi']})
- Ruling Planet (Graha): {profile['ruling_graha']}
- Nakshatra Deity: {profile['nakshatra_deity']}
- Date of Birth: {profile.get('dob', 'Not provided')}
- Concern: {concern}

Provide detailed, practical Vedic remedies."""

        ai_response = await chat.send_message(UserMessage(text=prompt))

        # Save upaya to history
        upaya_doc = {
            "user_id": user_id,
            "concern": concern,
            "nakshatra": profile["nakshatra_name_en"],
            "graha": profile["ruling_graha"],
            "upaya_text": ai_response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.upaya_history.insert_one(upaya_doc)

        return {
            "upaya": ai_response,
            "nakshatra": profile["nakshatra_name_en"],
            "nakshatra_hi": profile["nakshatra_name_hi"],
            "ruling_graha": profile["ruling_graha"],
            "deity": profile["nakshatra_deity"],
            "concern": concern
        }
    except Exception as e:
        logger.error(f"Upaya generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate Upaya: {str(e)}")

@api_router.get("/user/upaya-history/{user_id}")
async def get_upaya_history(user_id: str):
    history = await db.upaya_history.find({"user_id": user_id}).sort("created_at", -1).to_list(20)
    return [serialize_doc(h) for h in history]

@api_router.get("/nakshatra/{nakshatra_num}/content")
async def get_nakshatra_content(nakshatra_num: int):
    nakshatra = next((n for n in NAKSHATRAS if n["num"] == nakshatra_num), None)
    if not nakshatra:
        raise HTTPException(status_code=404, detail="Nakshatra not found")

    graha = nakshatra["graha"].lower()
    deity = nakshatra["deity"].lower()
    regex_graha = {"$regex": graha, "$options": "i"}
    regex_deity = {"$regex": deity, "$options": "i"}

    items = await db.content_items.find({
        "status": "published",
        "$or": [{"tags": regex_graha}, {"tags": regex_deity}, {"deity": {"$regex": nakshatra["deity"], "$options": "i"}}]
    }).limit(10).to_list(10)

    return {
        "nakshatra": nakshatra,
        "recommended_content": [serialize_doc(i) for i in items],
        "graha_mantras": {
            "Ketu": "ॐ केतवे नमः (Om Ketave Namah)",
            "Venus": "ॐ शुक्राय नमः (Om Shukraya Namah)",
            "Sun": "ॐ सूर्याय नमः (Om Suryaya Namah)",
            "Moon": "ॐ सोमाय नमः (Om Somaya Namah)",
            "Mars": "ॐ अंगारकाय नमः (Om Angarakaya Namah)",
            "Rahu": "ॐ राहवे नमः (Om Rahave Namah)",
            "Jupiter": "ॐ बृहस्पतये नमः (Om Brihaspataye Namah)",
            "Saturn": "ॐ शनैश्चराय नमः (Om Shanaishcharaya Namah)",
            "Mercury": "ॐ बुधाय नमः (Om Budhaya Namah)"
        }.get(nakshatra["graha"], "")
    }

# ===================== INTEGRATION SETTINGS HUB =====================

INTEGRATION_CATEGORIES = {
    "ai_llm": {"label": "AI / LLM", "icon": "brain", "fields": [
        {"key": "emergent_llm_key", "label": "Emergent LLM Key (Universal)", "type": "secret", "description": "Universal key for Claude, OpenAI, Gemini via Emergent"},
        {"key": "openai_api_key", "label": "OpenAI API Key", "type": "secret", "description": "Direct OpenAI key (if not using Emergent)"},
        {"key": "anthropic_api_key", "label": "Anthropic API Key", "type": "secret", "description": "Direct Claude key (if not using Emergent)"},
        {"key": "ai_model_chat", "label": "Chat Model", "type": "text", "description": "Model for VedaChat (e.g., claude-sonnet-4-5-20250929)"},
        {"key": "ai_model_parsing", "label": "Parsing Model", "type": "text", "description": "Model for DOCX/PDF parsing"},
    ]},
    "tts_audio": {"label": "Text-to-Speech", "icon": "headphones", "fields": [
        {"key": "tts_provider", "label": "TTS Provider", "type": "select", "options": ["google", "openai", "elevenlabs"], "description": "Which TTS provider to use (switchable)"},
        {"key": "google_cloud_credentials_json", "label": "Google Cloud Service Account JSON", "type": "secret", "description": "Paste full JSON content of GCP service account (TTS API enabled)"},
        {"key": "google_cloud_api_key", "label": "Google Cloud API Key (alt)", "type": "secret", "description": "Alternative: API key with TTS API enabled"},
        {"key": "elevenlabs_api_key", "label": "ElevenLabs API Key", "type": "secret", "description": "Get from elevenlabs.io"},
        {"key": "elevenlabs_voice_id", "label": "ElevenLabs Voice ID", "type": "text", "description": "Default voice id"},
        {"key": "tts_default_voice", "label": "Default Voice", "type": "text", "description": "Default voice (e.g., hi-IN-Wavenet-A, echo, alloy)"},
        {"key": "tts_default_model", "label": "Default Model", "type": "text", "description": "tts-1, tts-1-hd, eleven_multilingual_v2"},
    ]},
    "image_gen": {"label": "Image Generation", "icon": "image", "fields": [
        {"key": "image_provider", "label": "Provider", "type": "select", "options": ["gemini_nano_banana", "dall_e", "midjourney"], "description": "Image generation provider"},
        {"key": "image_model", "label": "Model", "type": "text", "description": "e.g., gemini-3.1-flash-image-preview"},
    ]},
    "video_gen": {"label": "Video Generation", "icon": "video", "fields": [
        {"key": "video_provider", "label": "Provider", "type": "select", "options": ["sora_2", "pika_labs", "runway"], "description": "Video generation provider"},
        {"key": "video_model", "label": "Model", "type": "text", "description": "e.g., sora-2 or sora-2-pro"},
        {"key": "video_api_key", "label": "Video API Key", "type": "secret", "description": "API key if different from Emergent key"},
    ]},
    "sms_otp": {"label": "SMS / OTP", "icon": "phone", "fields": [
        {"key": "sms_provider", "label": "SMS Provider", "type": "select", "options": ["msg91", "twilio", "textlocal"], "description": "SMS gateway provider"},
        {"key": "msg91_auth_key", "label": "MSG91 Auth Key", "type": "secret", "description": "Get from MSG91 dashboard"},
        {"key": "msg91_template_id", "label": "MSG91 Template ID", "type": "text", "description": "Approved OTP template ID"},
        {"key": "msg91_sender_id", "label": "MSG91 Sender ID", "type": "text", "description": "6-char sender ID (e.g., SANATH)"},
        {"key": "twilio_account_sid", "label": "Twilio Account SID", "type": "secret"},
        {"key": "twilio_auth_token", "label": "Twilio Auth Token", "type": "secret"},
        {"key": "twilio_phone_number", "label": "Twilio Phone Number", "type": "text"},
    ]},
    "payment": {"label": "Payment Gateway", "icon": "credit-card", "fields": [
        {"key": "payment_provider", "label": "Payment Provider", "type": "select", "options": ["razorpay", "cashfree", "paytm"], "description": "Indian payment gateway"},
        {"key": "razorpay_key_id", "label": "Razorpay Key ID", "type": "text", "description": "Get from Razorpay Dashboard"},
        {"key": "razorpay_key_secret", "label": "Razorpay Key Secret", "type": "secret", "description": "Razorpay secret key"},
        {"key": "razorpay_webhook_secret", "label": "Webhook Secret", "type": "secret"},
        {"key": "subscription_monthly_price", "label": "Monthly Price (INR)", "type": "text", "description": "e.g., 99"},
        {"key": "subscription_yearly_price", "label": "Yearly Price (INR)", "type": "text", "description": "e.g., 799"},
    ]},
    "storage": {"label": "Cloud Storage", "icon": "cloud", "fields": [
        {"key": "storage_provider", "label": "Provider", "type": "select", "options": ["cloudflare_r2", "aws_s3", "supabase"], "description": "File storage provider"},
        {"key": "r2_account_id", "label": "Cloudflare Account ID", "type": "text"},
        {"key": "r2_access_key_id", "label": "R2 Access Key ID", "type": "secret"},
        {"key": "r2_secret_access_key", "label": "R2 Secret Access Key", "type": "secret"},
        {"key": "r2_bucket_name", "label": "R2 Bucket Name", "type": "text"},
        {"key": "r2_public_url", "label": "R2 Public URL", "type": "text", "description": "Custom domain or R2 public URL"},
    ]},
    "push_notifications": {"label": "Push Notifications", "icon": "bell", "fields": [
        {"key": "push_provider", "label": "Provider", "type": "select", "options": ["expo", "onesignal", "firebase"], "description": "Push notification service"},
        {"key": "onesignal_app_id", "label": "OneSignal App ID", "type": "text"},
        {"key": "onesignal_api_key", "label": "OneSignal API Key", "type": "secret"},
        {"key": "firebase_server_key", "label": "Firebase Server Key", "type": "secret"},
        {"key": "daily_reminder_time", "label": "Daily Reminder Time", "type": "text", "description": "e.g., 06:00"},
        {"key": "daily_reminder_enabled", "label": "Reminders Enabled", "type": "toggle"},
    ]},
    "analytics": {"label": "Analytics", "icon": "bar-chart", "fields": [
        {"key": "analytics_provider", "label": "Provider", "type": "select", "options": ["built_in", "posthog", "mixpanel", "google_analytics"]},
        {"key": "posthog_api_key", "label": "PostHog API Key", "type": "secret"},
        {"key": "ga_measurement_id", "label": "GA Measurement ID", "type": "text"},
    ]},
}

@api_router.get("/admin/integrations/schema")
async def get_integration_schema(admin: dict = Depends(require_role(["super_admin"]))):
    return INTEGRATION_CATEGORIES

@api_router.get("/admin/integrations")
async def get_all_integrations(admin: dict = Depends(require_role(["super_admin"]))):
    settings = await db.integration_settings.find({}).to_list(200)
    result = {}
    for s in settings:
        key = s.get("key", "")
        val = s.get("value", "")
        field_type = s.get("field_type", "text")
        if s.get("encrypted") and val:
            decrypted = decrypt_value(val)
            display_val = mask_secret(decrypted) if field_type == "secret" else decrypted
        elif field_type == "secret" and val:
            display_val = mask_secret(val)
        else:
            display_val = val
        result[key] = {"value": display_val, "is_set": bool(s.get("value")), "updated_at": s.get("updated_at", "")}
    return result

@api_router.put("/admin/integrations")
async def update_integrations(request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    updated = 0
    changed_keys = []
    for key, value in body.items():
        if value is not None and value != "":
            field_type = "text"
            for cat in INTEGRATION_CATEGORIES.values():
                for f in cat["fields"]:
                    if f["key"] == key:
                        field_type = f.get("type", "text")
                        break
            store_value = encrypt_value(value) if field_type == "secret" else value
            await db.integration_settings.update_one(
                {"key": key},
                {"$set": {"key": key, "value": store_value, "field_type": field_type, "encrypted": field_type == "secret", "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["_id"]}},
                upsert=True
            )
            updated += 1
            changed_keys.append(key)
    await log_audit("integration_settings_updated", admin_id=admin["_id"], admin_email=admin.get("email"), ip=admin.get("_ip", ""), details={"keys": changed_keys})
    return {"message": f"Updated {updated} settings", "count": updated}

@api_router.delete("/admin/integrations/{key}")
async def delete_integration(key: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.integration_settings.delete_one({"key": key})
    return {"message": f"Deleted {key}"}

# Helper to get integration setting
async def get_setting(key: str, default: str = "") -> str:
    doc = await db.integration_settings.find_one({"key": key})
    if doc and doc.get("value"):
        return doc["value"]
    return os.environ.get(key.upper(), default)

# ===================== ANALYTICS & TRACKING =====================

@api_router.post("/analytics/event")
async def track_event(request: Request):
    body = await request.json()
    event = {
        "event_type": body.get("event_type", "page_view"),
        "user_id": body.get("user_id"),
        "content_id": body.get("content_id"),
        "content_type": body.get("content_type"),
        "action": body.get("action", "view"),
        "metadata": body.get("metadata", {}),
        "device": body.get("device", ""),
        "platform": body.get("platform", "web"),
        "location": body.get("location", {}),
        "session_id": body.get("session_id", ""),
        "duration_seconds": body.get("duration_seconds", 0),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.analytics_events.insert_one(event)
    return {"message": "Event tracked"}

@api_router.get("/admin/analytics/overview")
async def analytics_overview(admin: dict = Depends(require_role(["super_admin", "content_admin"])), days: int = 30):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    total_events = await db.analytics_events.count_documents({"timestamp": {"$gte": cutoff}})
    total_users = await db.user_profiles.count_documents({})
    active_users = await db.analytics_events.distinct("user_id", {"timestamp": {"$gte": cutoff}})

    # Content popularity
    popular_content = await db.analytics_events.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}, "content_id": {"$ne": None}}},
        {"$group": {"_id": "$content_id", "views": {"$sum": 1}, "total_duration": {"$sum": "$duration_seconds"}}},
        {"$sort": {"views": -1}},
        {"$limit": 10}
    ]).to_list(10)

    # Enrich with content names
    for item in popular_content:
        if item["_id"]:
            try:
                content = await db.content_items.find_one({"_id": ObjectId(item["_id"])}, {"title_en": 1, "title_hi": 1, "category": 1})
                item["title_en"] = content.get("title_en", "") if content else ""
                item["title_hi"] = content.get("title_hi", "") if content else ""
                item["category"] = content.get("category", "") if content else ""
            except Exception:
                item["title_en"] = "Unknown"

    # Event type breakdown
    event_types = await db.analytics_events.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)

    # Daily active users trend
    daily_trend = await db.analytics_events.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": {"$substr": ["$timestamp", 0, 10]}, "events": {"$sum": 1}, "users": {"$addToSet": "$user_id"}}},
        {"$project": {"date": "$_id", "events": 1, "unique_users": {"$size": "$users"}}},
        {"$sort": {"_id": 1}}
    ]).to_list(60)

    # Platform breakdown
    platforms = await db.analytics_events.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)

    # Location data
    locations = await db.analytics_events.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}, "location.country": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$location.country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)

    # Category popularity
    category_stats = await db.analytics_events.aggregate([
        {"$match": {"timestamp": {"$gte": cutoff}, "content_type": {"$ne": None}}},
        {"$group": {"_id": "$content_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)

    return {
        "period_days": days,
        "total_events": total_events,
        "total_users": total_users,
        "active_users": len(active_users),
        "popular_content": popular_content,
        "event_types": [{"type": e["_id"] or "unknown", "count": e["count"]} for e in event_types],
        "daily_trend": [{"date": d.get("date", d.get("_id")), "events": d["events"], "users": d.get("unique_users", 0)} for d in daily_trend],
        "platforms": [{"name": p["_id"] or "unknown", "count": p["count"]} for p in platforms],
        "locations": [{"country": l["_id"], "count": l["count"]} for l in locations],
        "category_stats": [{"category": c["_id"] or "unknown", "count": c["count"]} for c in category_stats],
    }

# ===================== STREAKS & GAMIFICATION =====================

@api_router.post("/user/streak/check-in")
async def streak_checkin(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    streak = await db.user_streaks.find_one({"user_id": user_id})
    if not streak:
        streak = {"user_id": user_id, "current_streak": 1, "longest_streak": 1, "last_checkin": today, "total_days": 1, "badges": [], "checkin_dates": [today]}
        await db.user_streaks.insert_one(streak)
    else:
        last = streak.get("last_checkin", "")
        if last == today:
            pass  # Already checked in today
        elif last == yesterday:
            new_streak = streak.get("current_streak", 0) + 1
            longest = max(streak.get("longest_streak", 0), new_streak)
            dates = streak.get("checkin_dates", [])
            dates.append(today)
            badges = streak.get("badges", [])
            if new_streak >= 7 and "week_warrior" not in badges:
                badges.append("week_warrior")
            if new_streak >= 30 and "month_master" not in badges:
                badges.append("month_master")
            if new_streak >= 108 and "mala_complete" not in badges:
                badges.append("mala_complete")
            if new_streak >= 365 and "year_yogi" not in badges:
                badges.append("year_yogi")
            await db.user_streaks.update_one({"user_id": user_id}, {"$set": {"current_streak": new_streak, "longest_streak": longest, "last_checkin": today, "total_days": streak.get("total_days", 0) + 1, "badges": badges, "checkin_dates": dates[-365:]}})
        else:
            dates = streak.get("checkin_dates", [])
            dates.append(today)
            await db.user_streaks.update_one({"user_id": user_id}, {"$set": {"current_streak": 1, "last_checkin": today, "total_days": streak.get("total_days", 0) + 1, "checkin_dates": dates[-365:]}})

    updated = await db.user_streaks.find_one({"user_id": user_id}, {"_id": 0})
    return updated

@api_router.get("/user/streak/{user_id}")
async def get_streak(user_id: str):
    streak = await db.user_streaks.find_one({"user_id": user_id}, {"_id": 0})
    if not streak:
        return {"user_id": user_id, "current_streak": 0, "longest_streak": 0, "total_days": 0, "badges": []}
    return streak

@api_router.get("/admin/analytics/streaks")
async def analytics_streaks(admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    total = await db.user_streaks.count_documents({})
    active_today = await db.user_streaks.count_documents({"last_checkin": datetime.now(timezone.utc).strftime("%Y-%m-%d")})

    top_streakers = await db.user_streaks.find({}).sort("current_streak", -1).limit(10).to_list(10)
    streak_distribution = await db.user_streaks.aggregate([
        {"$bucket": {"groupBy": "$current_streak", "boundaries": [0, 1, 7, 30, 108, 365, 9999], "default": "other", "output": {"count": {"$sum": 1}}}}
    ]).to_list(10)

    badge_counts = await db.user_streaks.aggregate([
        {"$unwind": "$badges"},
        {"$group": {"_id": "$badges", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)

    return {
        "total_users_with_streaks": total,
        "active_today": active_today,
        "top_streakers": [serialize_doc(s) for s in top_streakers],
        "streak_distribution": streak_distribution,
        "badge_counts": [{"badge": b["_id"], "count": b["count"]} for b in badge_counts]
    }

# ===================== AUDIT TRAIL & SECURITY DASHBOARD =====================

@api_router.get("/admin/audit-trail")
async def get_audit_trail(admin: dict = Depends(require_role(["super_admin"])), limit: int = 100, action: str = ""):
    query = {}
    if action:
        query["action"] = action
    trail = await db.audit_trail.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [serialize_doc(t) for t in trail]

@api_router.get("/admin/security/dashboard")
async def security_dashboard(admin: dict = Depends(require_role(["super_admin"]))):
    now = datetime.now(timezone.utc)
    last_24h = (now - timedelta(hours=24)).isoformat()
    last_7d = (now - timedelta(days=7)).isoformat()

    # Login attempts (last 24h)
    login_success = await db.audit_trail.count_documents({"action": "login_success", "timestamp": {"$gte": last_24h}})
    login_failed = await db.audit_trail.count_documents({"action": "login_failed", "timestamp": {"$gte": last_24h}})
    rate_limited = await db.audit_trail.count_documents({"action": "rate_limit_exceeded", "timestamp": {"$gte": last_24h}})

    # Security events (last 7 days)
    security_events = await db.security_events.find({"timestamp": {"$gte": last_7d}}).sort("timestamp", -1).limit(50).to_list(50)

    # Suspicious IPs (multiple failed logins)
    suspicious_ips = await db.audit_trail.aggregate([
        {"$match": {"action": "login_failed", "timestamp": {"$gte": last_7d}}},
        {"$group": {"_id": "$ip_address", "count": {"$sum": 1}, "last_attempt": {"$max": "$timestamp"}}},
        {"$match": {"count": {"$gte": 3}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)

    # Recent admin actions
    recent_actions = await db.audit_trail.find({"action": {"$nin": ["login_success", "login_failed", "rate_limit_exceeded"]}}).sort("timestamp", -1).limit(20).to_list(20)

    # Active sessions (admins who logged in recently)
    active_admins = await db.admin_users.find({"last_login_at": {"$gte": last_24h}}, {"password_hash": 0}).to_list(20)

    # Auth events by hour (last 24h)
    hourly_events = await db.audit_trail.aggregate([
        {"$match": {"timestamp": {"$gte": last_24h}, "action": {"$in": ["login_success", "login_failed"]}}},
        {"$group": {"_id": {"$substr": ["$timestamp", 11, 2]}, "success": {"$sum": {"$cond": [{"$eq": ["$action", "login_success"]}, 1, 0]}}, "failed": {"$sum": {"$cond": [{"$eq": ["$action", "login_failed"]}, 1, 0]}}}},
        {"$sort": {"_id": 1}}
    ]).to_list(24)

    # Token blacklist count
    blacklisted_tokens = await db.token_blacklist.count_documents({})

    return {
        "last_24h": {
            "login_success": login_success,
            "login_failed": login_failed,
            "rate_limited": rate_limited,
            "total_auth_events": login_success + login_failed + rate_limited
        },
        "security_events": [serialize_doc(e) for e in security_events],
        "suspicious_ips": [{"ip": s["_id"], "attempts": s["count"], "last_attempt": s["last_attempt"]} for s in suspicious_ips],
        "recent_admin_actions": [serialize_doc(a) for a in recent_actions],
        "active_admins": [serialize_doc(a) for a in active_admins],
        "hourly_auth_trend": [{"hour": h["_id"], "success": h["success"], "failed": h["failed"]} for h in hourly_events],
        "blacklisted_tokens": blacklisted_tokens,
    }

@api_router.post("/admin/security/block-ip")
async def block_ip(request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    ip = body.get("ip")
    reason = body.get("reason", "Manual block")
    if not ip:
        raise HTTPException(status_code=400, detail="IP required")
    await db.blocked_ips.update_one({"ip": ip}, {"$set": {"ip": ip, "reason": reason, "blocked_by": admin["_id"], "blocked_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    await log_audit("ip_blocked", admin_id=admin["_id"], admin_email=admin.get("email"), ip=admin.get("_ip", ""), details={"blocked_ip": ip, "reason": reason})
    return {"message": f"IP {ip} blocked"}

@api_router.get("/admin/security/blocked-ips")
async def list_blocked_ips(admin: dict = Depends(require_role(["super_admin"]))):
    ips = await db.blocked_ips.find({}).to_list(100)
    return [serialize_doc(i) for i in ips]

@api_router.delete("/admin/security/blocked-ips/{ip}")
async def unblock_ip(ip: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.blocked_ips.delete_one({"ip": ip})
    await log_audit("ip_unblocked", admin_id=admin["_id"], ip=admin.get("_ip", ""), details={"unblocked_ip": ip})
    return {"message": f"IP {ip} unblocked"}

# ===================== BLOG POSTS =====================

@api_router.get("/blog/posts")
async def list_blog_posts(status: str = "published", skip: int = 0, limit: int = 20):
    query = {"status": status} if status else {}
    posts = await db.blog_posts.find(query, {"content": 0}).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.blog_posts.count_documents(query)
    return {"posts": [serialize_doc(p) for p in posts], "total": total}

@api_router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "status": "published"})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.blog_posts.update_one({"_id": post["_id"]}, {"$inc": {"views": 1}})
    return serialize_doc(post)

@api_router.post("/admin/blog/posts")
async def create_blog_post(request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    slug = body.get("title", "post").lower().replace(" ", "-").replace("'", "")[:80]
    # Ensure unique slug
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:6]}"
    doc = {
        "title": body.get("title", ""),
        "slug": slug,
        "excerpt": body.get("excerpt", ""),
        "content": body.get("content", ""),
        "cover_image": body.get("cover_image", ""),
        "category": body.get("category", "general"),
        "tags": body.get("tags", []),
        "author_name": admin.get("name", "Admin"),
        "author_id": admin["_id"],
        "status": body.get("status", "draft"),
        "views": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": datetime.now(timezone.utc).isoformat() if body.get("status") == "published" else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.blog_posts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    await log_audit("blog_post_created", admin_id=admin["_id"], admin_email=admin.get("email"), ip=admin.get("_ip", ""), details={"title": doc["title"], "slug": slug})
    return doc

@api_router.put("/admin/blog/posts/{post_id}")
async def update_blog_post(post_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    if body.get("status") == "published" and not body.get("published_at"):
        body["published_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"_id": ObjectId(post_id)}, {"$set": body})
    updated = await db.blog_posts.find_one({"_id": ObjectId(post_id)})
    return serialize_doc(updated)

@api_router.delete("/admin/blog/posts/{post_id}")
async def delete_blog_post(post_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.blog_posts.delete_one({"_id": ObjectId(post_id)})
    return {"message": "Deleted"}

@api_router.get("/admin/blog/posts")
async def admin_list_blog_posts(admin: dict = Depends(require_role(["super_admin", "content_admin", "moderator"]))):
    posts = await db.blog_posts.find({}).sort("created_at", -1).to_list(200)
    return [serialize_doc(p) for p in posts]

# ===================== CMS PAGES =====================

@api_router.get("/pages/{slug}")
async def get_cms_page(slug: str):
    page = await db.cms_pages.find_one({"slug": slug, "is_active": True})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return serialize_doc(page)

@api_router.get("/pages")
async def list_cms_pages():
    pages = await db.cms_pages.find({"is_active": True}, {"content": 0}).sort("sort_order", 1).to_list(50)
    return [serialize_doc(p) for p in pages]

@api_router.post("/admin/pages")
async def create_cms_page(request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    slug = body.get("slug") or body.get("title", "page").lower().replace(" ", "-")[:60]
    doc = {
        "title": body.get("title", ""),
        "slug": slug,
        "content": body.get("content", ""),
        "meta_description": body.get("meta_description", ""),
        "show_in_menu": body.get("show_in_menu", False),
        "menu_position": body.get("menu_position", "footer"),
        "sort_order": body.get("sort_order", 0),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.cms_pages.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@api_router.put("/admin/pages/{page_id}")
async def update_cms_page(page_id: str, request: Request, admin: dict = Depends(require_role(["super_admin"]))):
    body = await request.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.cms_pages.update_one({"_id": ObjectId(page_id)}, {"$set": body})
    updated = await db.cms_pages.find_one({"_id": ObjectId(page_id)})
    return serialize_doc(updated)

@api_router.delete("/admin/pages/{page_id}")
async def delete_cms_page(page_id: str, admin: dict = Depends(require_role(["super_admin"]))):
    await db.cms_pages.delete_one({"_id": ObjectId(page_id)})
    return {"message": "Deleted"}

@api_router.get("/admin/pages")
async def admin_list_pages(admin: dict = Depends(require_role(["super_admin"]))):
    pages = await db.cms_pages.find({}).sort("sort_order", 1).to_list(50)
    return [serialize_doc(p) for p in pages]

# ===================== PUBLIC VEDACHAT (5 Questions Limit) =====================

@api_router.post("/public/ask")
async def public_vedachat(request: Request):
    body = await request.json()
    question = body.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    ip = get_client_ip(request)
    session_id = body.get("session_id", ip)
    identifier = f"public:{session_id}"

    # Check rate limit (5 questions per session/IP)
    limit_doc = await db.public_chat_limits.find_one({"identifier": identifier})
    if limit_doc and limit_doc.get("count", 0) >= 5:
        return {"limited": True, "message": "You've used all 5 free questions! Download the Sanatan Saathi app for unlimited access to VedaChat.", "remaining": 0}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=f"public-{identifier}",
            system_message="""You are VedaChat, a knowledgeable spiritual guide for Sanatan Dharma. Answer questions about Hindu scriptures, philosophy, rituals, and spiritual practices. Always cite scripture references. Keep answers concise (2-3 paragraphs max) for the web widget."""
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        ai_response = await chat.send_message(UserMessage(text=question))

        # Update limit
        await db.public_chat_limits.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_question_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        current_count = (limit_doc.get("count", 0) if limit_doc else 0) + 1

        return {"answer": ai_response, "remaining": max(0, 5 - current_count), "limited": False}
    except Exception as e:
        logger.error(f"Public VedaChat error: {e}")
        raise HTTPException(status_code=500, detail="Unable to process your question right now")

# ===================== PUBLIC HOMEPAGE DATA =====================

@api_router.get("/public/homepage")
async def public_homepage():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    panchang = await db.panchang.find_one({"date": today})

    # Featured content by category
    categories_data = {}
    for cat in ["chalisa", "vedic_mantra", "ashtakam", "sahasranama", "katha", "arti"]:
        items = await db.content_items.find({"category": cat, "status": "published"}, {"_id": 1, "title_hi": 1, "title_en": 1, "deity": 1, "total_verses": 1}).sort("sort_order", 1).limit(4).to_list(4)
        categories_data[cat] = [serialize_doc(i) for i in items]

    granths = await db.granth_books.find({"is_active": True}).sort("sort_order", 1).to_list(5)
    vedas = await db.veda_books.find({"is_active": True}).sort("sort_order", 1).to_list(5)
    recent_blogs = await db.blog_posts.find({"status": "published"}, {"content": 0}).sort("published_at", -1).limit(3).to_list(3)
    menu_pages = await db.cms_pages.find({"is_active": True, "show_in_menu": True}, {"content": 0}).sort("sort_order", 1).to_list(20)

    total_content = await db.content_items.count_documents({"status": "published"})
    total_verses = 0
    # Rough verse count
    verse_agg = await db.content_items.aggregate([{"$match": {"status": "published"}}, {"$group": {"_id": None, "total": {"$sum": "$total_verses"}}}]).to_list(1)
    if verse_agg:
        total_verses = verse_agg[0].get("total", 0)

    return {
        "panchang": serialize_doc(panchang) if panchang else None,
        "categories": categories_data,
        "granths": [serialize_doc(g) for g in granths],
        "vedas": [serialize_doc(v) for v in vedas],
        "recent_blogs": [serialize_doc(b) for b in recent_blogs],
        "menu_pages": [serialize_doc(p) for p in menu_pages],
        "stats": {"total_content": total_content, "total_verses": total_verses, "total_granths": len(granths), "total_vedas": len(vedas)},
    }

# ===================== OFFLINE DATA BUNDLE =====================

@api_router.get("/offline/bundle")
async def offline_bundle():
    """Returns essential data for offline caching in mobile app"""
    categories = await db.content_items.find({"status": "published"}, {"_id": 1, "category": 1, "title_hi": 1, "title_en": 1, "deity": 1, "total_verses": 1, "sort_order": 1}).sort("sort_order", 1).to_list(200)
    panchang = await db.panchang.find({}).sort("date", 1).limit(30).to_list(30)
    home_cats = [
        {"key": "vedic_mantra", "title_hi": "वैदिक मंत्र", "title_en": "Vedic Mantras"},
        {"key": "chalisa", "title_hi": "चालीसा", "title_en": "Chalisa"},
        {"key": "ashtakam", "title_hi": "अष्टकम्", "title_en": "Ashtakam"},
        {"key": "sahasranama", "title_hi": "सहस्रनाम", "title_en": "Sahasranama"},
        {"key": "katha", "title_hi": "कथा एवं पूजा", "title_en": "Katha & Puja"},
        {"key": "arti", "title_hi": "आरती संग्रह", "title_en": "Arti Sangrah"},
        {"key": "nama_ramayanam", "title_hi": "नाम रामायणम्", "title_en": "Nama Ramayanam"},
    ]
    return {
        "content_items": [serialize_doc(c) for c in categories],
        "panchang": [serialize_doc(p) for p in panchang],
        "categories": home_cats,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }

@api_router.get("/offline/content/{item_id}")
async def offline_content(item_id: str):
    """Full content with verses and meanings for offline caching"""
    item = await db.content_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    verses = await db.content_verses.find({"item_id": item_id}, {"audio_base64": 0}).sort("sort_order", 1).to_list(500)
    meanings = {}
    for v in verses:
        vid = str(v["_id"])
        m = await db.verse_meanings.find({"verse_id": vid}).to_list(20)
        meanings[vid] = [serialize_doc(x) for x in m]
    return {
        "item": serialize_doc(item),
        "verses": [serialize_doc(v) for v in verses],
        "meanings": meanings,
    }

# ===================== SEED DATA =====================

async def seed_data():
    # Seed Super Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@sanatansaathi.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "SanatanAdmin@123")
    existing = await db.admin_users.find_one({"email": admin_email})
    if not existing:
        await db.admin_users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Super Admin",
            "role": "super_admin",
            "is_active": True,
            "created_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login_at": None
        })
        logger.info(f"Super Admin created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.admin_users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Super Admin password updated")

    # Seed sample content if empty
    if await db.content_items.count_documents({}) == 0:
        sample_content = [
            {
                "category": "chalisa", "slug": "hanuman-chalisa", "title_hi": "हनुमान चालीसा", "title_en": "Hanuman Chalisa",
                "deity": "Hanuman", "deity_hi": "हनुमान", "description_hi": "श्री हनुमान चालीसा - तुलसीदास रचित",
                "description_en": "Hanuman Chalisa by Tulsidas - 40 verses praising Lord Hanuman",
                "thumbnail_url": "", "audio_url": "", "has_beginner_mode": True, "has_expert_mode": True,
                "total_verses": 40, "sort_order": 1, "is_active": True, "is_premium": False,
                "tags": ["daily", "popular", "hanuman"], "supported_languages": ["hi", "en", "sa"],
                "like_count": 0, "status": "published",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "category": "chalisa", "slug": "shiv-chalisa", "title_hi": "शिव चालीसा", "title_en": "Shiv Chalisa",
                "deity": "Shiva", "deity_hi": "शिव", "description_hi": "भगवान शिव की स्तुति",
                "description_en": "Shiv Chalisa - 40 verses praising Lord Shiva",
                "thumbnail_url": "", "audio_url": "", "has_beginner_mode": True, "has_expert_mode": True,
                "total_verses": 40, "sort_order": 2, "is_active": True, "is_premium": False,
                "tags": ["daily", "shiva"], "supported_languages": ["hi", "en", "sa"],
                "like_count": 0, "status": "published",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "category": "vedic_mantra", "slug": "gayatri-mantra", "title_hi": "गायत्री मंत्र", "title_en": "Gayatri Mantra",
                "deity": "Savitri", "deity_hi": "सावित्री", "description_hi": "वेद माता गायत्री मंत्र",
                "description_en": "The most sacred Gayatri Mantra from Rig Veda",
                "thumbnail_url": "", "audio_url": "", "has_beginner_mode": True, "has_expert_mode": True,
                "total_verses": 1, "sort_order": 1, "is_active": True, "is_premium": False,
                "tags": ["daily", "morning", "vedic"], "supported_languages": ["hi", "en", "sa"],
                "like_count": 0, "status": "published",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "category": "vedic_mantra", "slug": "mahamrityunjaya-mantra", "title_hi": "महामृत्युंजय मंत्र", "title_en": "Mahamrityunjaya Mantra",
                "deity": "Shiva", "deity_hi": "शिव", "description_hi": "मृत्यु पर विजय का मंत्र",
                "description_en": "The great death-conquering mantra from Rig Veda",
                "thumbnail_url": "", "audio_url": "", "has_beginner_mode": True, "has_expert_mode": True,
                "total_verses": 1, "sort_order": 2, "is_active": True, "is_premium": False,
                "tags": ["daily", "healing", "shiva"], "supported_languages": ["hi", "en", "sa"],
                "like_count": 0, "status": "published",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "category": "ashtakam", "slug": "shiva-ashtakam", "title_hi": "शिवाष्टकम्", "title_en": "Shivashtakam",
                "deity": "Shiva", "deity_hi": "शिव", "description_hi": "शिव की स्तुति में आठ श्लोक",
                "description_en": "Eight verses in praise of Lord Shiva",
                "thumbnail_url": "", "audio_url": "", "has_beginner_mode": True, "has_expert_mode": True,
                "total_verses": 8, "sort_order": 1, "is_active": True, "is_premium": False,
                "tags": ["shiva", "ashtakam"], "supported_languages": ["hi", "en", "sa"],
                "like_count": 0, "status": "published",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "category": "sahasranama", "slug": "vishnu-sahasranama", "title_hi": "विष्णु सहस्रनाम", "title_en": "Vishnu Sahasranama",
                "deity": "Vishnu", "deity_hi": "विष्णु", "description_hi": "भगवान विष्णु के एक हज़ार नाम",
                "description_en": "1000 names of Lord Vishnu from Mahabharata",
                "thumbnail_url": "", "audio_url": "", "has_beginner_mode": True, "has_expert_mode": True,
                "total_verses": 107, "sort_order": 1, "is_active": True, "is_premium": False,
                "tags": ["vishnu", "daily"], "supported_languages": ["hi", "en", "sa"],
                "like_count": 0, "status": "published",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        await db.content_items.insert_many(sample_content)
        logger.info(f"Seeded {len(sample_content)} content items")

        # Seed sample verses for Hanuman Chalisa
        hanuman = await db.content_items.find_one({"slug": "hanuman-chalisa"})
        if hanuman:
            hid = str(hanuman["_id"])
            sample_verses = [
                {"item_id": hid, "verse_num": 1, "verse_type": "doha", "sanskrit_text": "श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि।\nबरनउँ रघुबर बिमल जसु, जो दायकु फल चारि।।", "transliteration": "Shri Guru Charan Saroj Raj, Nij Manu Mukuru Sudhari.\nBaranau Raghubar Bimal Jasu, Jo Dayaku Phal Chari.", "sort_order": 1, "is_active": True},
                {"item_id": hid, "verse_num": 2, "verse_type": "doha", "sanskrit_text": "बुद्धिहीन तनु जानिके, सुमिरौं पवन कुमार।\nबल बुद्धि विद्या देहु मोहिं, हरहु कलेस विकार।।", "transliteration": "Buddhiheen Tanu Jaanike, Sumirau Pawan Kumar.\nBal Buddhi Vidya Dehu Mohi, Harahu Kalesh Vikar.", "sort_order": 2, "is_active": True},
                {"item_id": hid, "verse_num": 3, "verse_type": "chaupai", "sanskrit_text": "जय हनुमान ज्ञान गुन सागर।\nजय कपीस तिहुँ लोक उजागर।।", "transliteration": "Jai Hanuman Gyan Gun Sagar.\nJai Kapees Tihun Lok Ujagar.", "sort_order": 3, "is_active": True},
                {"item_id": hid, "verse_num": 4, "verse_type": "chaupai", "sanskrit_text": "राम दूत अतुलित बल धामा।\nअंजनि पुत्र पवनसुत नामा।।", "transliteration": "Ram Doot Atulit Bal Dhama.\nAnjani Putra Pawansut Nama.", "sort_order": 4, "is_active": True},
                {"item_id": hid, "verse_num": 5, "verse_type": "chaupai", "sanskrit_text": "महाबीर बिक्रम बजरंगी।\nकुमति निवार सुमति के संगी।।", "transliteration": "Mahabir Bikram Bajrangi.\nKumati Nivar Sumati Ke Sangi.", "sort_order": 5, "is_active": True},
            ]
            await db.content_verses.insert_many(sample_verses)

            # Seed verse meanings
            verses = await db.content_verses.find({"item_id": hid}).to_list(5)
            meanings = [
                {"verse_id": str(verses[0]["_id"]), "language": "hi", "meaning": "गुरु महाराज के चरण कमलों की धूलि से अपने मन रूपी दर्पण को स्वच्छ करके, श्री रघुवीर के निर्मल यश का वर्णन करता हूँ, जो चारों फल देने वाला है।", "word_breakdown": [{"word": "श्रीगुरु", "meaning_hi": "श्री गुरु", "meaning_en": "Revered Guru"}, {"word": "चरन", "meaning_hi": "चरण", "meaning_en": "Feet"}, {"word": "सरोज", "meaning_hi": "कमल", "meaning_en": "Lotus"}, {"word": "रज", "meaning_hi": "धूल", "meaning_en": "Dust"}]},
                {"verse_id": str(verses[0]["_id"]), "language": "en", "meaning": "With the dust of Guru's lotus feet, I cleanse the mirror of my mind. I describe the unblemished glory of Sri Ramachandra, who bestows the four fruits of life.", "word_breakdown": []},
                {"verse_id": str(verses[2]["_id"]), "language": "hi", "meaning": "हे हनुमान जी! आप ज्ञान और गुणों के सागर हैं। हे कपीश्वर! तीनों लोकों में आपकी कीर्ति प्रकाशित है।", "word_breakdown": []},
                {"verse_id": str(verses[2]["_id"]), "language": "en", "meaning": "Victory to Hanuman, ocean of wisdom and virtue. Victory to the Lord of monkeys, who illuminates all three worlds.", "word_breakdown": []},
            ]
            await db.verse_meanings.insert_many(meanings)
            logger.info("Seeded Hanuman Chalisa verses and meanings")

    # Seed Granth books
    if await db.granth_books.count_documents({}) == 0:
        granths = [
            {"title_hi": "श्रीमद्भगवद्गीता", "title_en": "Bhagavad Gita", "slug": "bhagavad-gita", "description_hi": "भगवान श्रीकृष्ण द्वारा अर्जुन को दिया गया दिव्य उपदेश", "description_en": "The divine discourse by Lord Krishna to Arjuna on the battlefield of Kurukshetra", "thumbnail_url": "", "total_chapters": 18, "total_verses": 700, "sort_order": 1, "is_active": True},
            {"title_hi": "श्रीरामचरितमानस", "title_en": "Ramcharitmanas", "slug": "ramcharitmanas", "description_hi": "गोस्वामी तुलसीदास कृत श्री राम की जीवन गाथा", "description_en": "The epic poem by Tulsidas narrating the life of Lord Rama", "thumbnail_url": "", "total_chapters": 7, "total_verses": 1073, "sort_order": 2, "is_active": True},
            {"title_hi": "महाभारत", "title_en": "Mahabharata", "slug": "mahabharata", "description_hi": "महर्षि वेदव्यास रचित विश्व का सबसे बड़ा महाकाव्य", "description_en": "The world's greatest epic by Sage Vedavyasa", "thumbnail_url": "", "total_chapters": 18, "total_verses": 100000, "sort_order": 3, "is_active": True},
        ]
        await db.granth_books.insert_many(granths)
        logger.info("Seeded Granth books")

    # Seed Veda books
    if await db.veda_books.count_documents({}) == 0:
        vedas = [
            {"title_hi": "ऋग्वेद", "title_en": "Rig Veda", "category": "veda", "sub_type": "rig", "description_hi": "सबसे प्राचीन वेद - ज्ञान का वेद", "description_en": "The oldest Veda - Veda of Knowledge", "total_chapters": 10, "sort_order": 1, "is_active": True, "parsing_status": "pending"},
            {"title_hi": "सामवेद", "title_en": "Sama Veda", "category": "veda", "sub_type": "sama", "description_hi": "संगीत का वेद", "description_en": "The Veda of Melodies", "total_chapters": 2, "sort_order": 2, "is_active": True, "parsing_status": "pending"},
            {"title_hi": "यजुर्वेद", "title_en": "Yajur Veda", "category": "veda", "sub_type": "yajur", "description_hi": "यज्ञ विधि का वेद", "description_en": "The Veda of Rituals", "total_chapters": 40, "sort_order": 3, "is_active": True, "parsing_status": "pending"},
            {"title_hi": "अथर्ववेद", "title_en": "Atharva Veda", "category": "veda", "sub_type": "atharva", "description_hi": "तंत्र और मंत्र का वेद", "description_en": "The Veda of Procedures", "total_chapters": 20, "sort_order": 4, "is_active": True, "parsing_status": "pending"},
        ]
        await db.veda_books.insert_many(vedas)
        logger.info("Seeded Veda books")

    # Seed Kathas
    if await db.katha_items.count_documents({}) == 0:
        kathas = [
            {"title_hi": "सत्यनारायण कथा", "title_en": "Satyanarayan Katha", "deity": "Vishnu", "deity_hi": "विष्णु", "intro_text_hi": "श्री सत्यनारायण भगवान की पावन कथा", "intro_text_en": "The sacred story of Lord Satyanarayan", "puja_vidhi": [{"step": 1, "text_hi": "स्नान करें और शुद्ध वस्त्र धारण करें", "text_en": "Take bath and wear clean clothes"}, {"step": 2, "text_hi": "पूजा स्थल को गंगाजल से शुद्ध करें", "text_en": "Purify the puja area with Ganga water"}], "samagri": [{"item_hi": "अक्षत (चावल)", "item_en": "Rice", "quantity": "100g"}, {"item_hi": "हल्दी", "item_en": "Turmeric", "quantity": "1 packet"}, {"item_hi": "कुमकुम", "item_en": "Kumkum", "quantity": "1 packet"}], "total_chapters": 5, "sort_order": 1, "is_active": True, "status": "published"},
            {"title_hi": "श्रीमद् भागवत कथा", "title_en": "Shrimad Bhagwat Katha", "deity": "Vishnu", "deity_hi": "विष्णु", "intro_text_hi": "भगवान विष्णु के दस अवतारों की कथा", "intro_text_en": "Stories of ten avatars of Lord Vishnu", "puja_vidhi": [], "samagri": [], "total_chapters": 12, "sort_order": 2, "is_active": True, "status": "published"},
        ]
        await db.katha_items.insert_many(kathas)
        logger.info("Seeded Kathas")

    # Seed Artis
    if await db.arti_items.count_documents({}) == 0:
        artis = [
            {"title_hi": "ॐ जय जगदीश हरे", "title_en": "Om Jai Jagdish Hare", "deity": "Vishnu", "deity_hi": "विष्णु", "music_url": "", "audio_duration_seconds": 300, "sort_order": 1, "is_active": True, "status": "published"},
            {"title_hi": "जय गणेश जय गणेश देवा", "title_en": "Jai Ganesh Jai Ganesh Deva", "deity": "Ganesha", "deity_hi": "गणेश", "music_url": "", "audio_duration_seconds": 240, "sort_order": 2, "is_active": True, "status": "published"},
            {"title_hi": "ॐ जय शिव ओंकारा", "title_en": "Om Jai Shiv Omkara", "deity": "Shiva", "deity_hi": "शिव", "music_url": "", "audio_duration_seconds": 270, "sort_order": 3, "is_active": True, "status": "published"},
        ]
        await db.arti_items.insert_many(artis)
        logger.info("Seeded Artis")

    # Seed Panchang
    if await db.panchang.count_documents({}) == 0:
        today = datetime.now(timezone.utc)
        panchang_entries = []
        for i in range(7):
            d = today + timedelta(days=i)
            panchang_entries.append({
                "date": d.strftime("%Y-%m-%d"),
                "tithi": ["शुक्ल प्रतिपदा", "शुक्ल द्वितीया", "शुक्ल तृतीया", "शुक्ल चतुर्थी", "शुक्ल पंचमी", "शुक्ल षष्ठी", "शुक्ल सप्तमी"][i],
                "nakshatra": ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशीर्ष", "आर्द्रा", "पुनर्वसु"][i],
                "yoga": ["विष्कुम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा"][i],
                "karana": "बव",
                "sunrise": "06:45",
                "sunset": "18:15",
                "rahu_kaal": "10:30-12:00",
                "festival_name": "" if i != 3 else "संकष्टी चतुर्थी",
                "festival_name_en": "" if i != 3 else "Sankashti Chaturthi",
                "is_panchak": False,
                "is_bhadra": False
            })
        await db.panchang.insert_many(panchang_entries)
        logger.info("Seeded Panchang data")

    # Seed Vrat & Festival data
    if await db.vrat_festivals.count_documents({}) == 0:
        vrat_data = [
            {"date": "", "recurring_day": "monday", "type": "vrat", "name_hi": "सोमवार व्रत", "name_en": "Monday Fast (Somvar Vrat)", "deity": "Shiva", "description_hi": "भगवान शिव की पूजा और व्रत", "description_en": "Fasting for Lord Shiva on Mondays", "linked_content_tags": ["shiva"], "is_active": True},
            {"date": "", "recurring_day": "tuesday", "type": "vrat", "name_hi": "मंगलवार व्रत", "name_en": "Tuesday Fast (Mangalvar Vrat)", "deity": "Hanuman", "description_hi": "हनुमान जी की पूजा और व्रत", "description_en": "Fasting for Lord Hanuman on Tuesdays", "linked_content_tags": ["hanuman"], "is_active": True},
            {"date": "", "recurring_day": "thursday", "type": "vrat", "name_hi": "गुरुवार व्रत", "name_en": "Thursday Fast (Guruvar Vrat)", "deity": "Vishnu", "description_hi": "भगवान विष्णु की पूजा और व्रत", "description_en": "Fasting for Lord Vishnu on Thursdays", "linked_content_tags": ["vishnu"], "is_active": True},
            {"date": "", "recurring_day": "saturday", "type": "vrat", "name_hi": "शनिवार व्रत", "name_en": "Saturday Fast (Shanivar Vrat)", "deity": "Shani", "description_hi": "शनि देव की पूजा और व्रत", "description_en": "Fasting for Lord Shani on Saturdays", "linked_content_tags": ["shani"], "is_active": True},
            {"date": "2026-03-14", "recurring_day": "", "type": "festival", "name_hi": "महाशिवरात्रि", "name_en": "Maha Shivratri", "deity": "Shiva", "description_hi": "भगवान शिव की महान रात्रि", "description_en": "The Great Night of Lord Shiva", "linked_content_tags": ["shiva"], "is_active": True},
            {"date": "2026-10-20", "recurring_day": "", "type": "festival", "name_hi": "दीपावली", "name_en": "Diwali", "deity": "Lakshmi", "description_hi": "दीपों का त्योहार", "description_en": "Festival of Lights", "linked_content_tags": ["lakshmi"], "is_active": True},
            {"date": "2026-10-02", "recurring_day": "", "type": "festival", "name_hi": "नवरात्रि", "name_en": "Navratri", "deity": "Durga", "description_hi": "नौ रातों का उत्सव - माँ दुर्गा की पूजा", "description_en": "Nine Nights Festival - Worship of Goddess Durga", "linked_content_tags": ["durga", "devi"], "is_active": True},
        ]
        await db.vrat_festivals.insert_many(vrat_data)
        logger.info("Seeded Vrat & Festival data")

    # Seed Daily Schedules
    if await db.daily_schedules.count_documents({}) == 0:
        # Get content IDs for scheduling
        hanuman = await db.content_items.find_one({"slug": "hanuman-chalisa"})
        gayatri = await db.content_items.find_one({"slug": "gayatri-mantra"})
        shiv = await db.content_items.find_one({"slug": "shiv-chalisa"})
        schedules = []
        if hanuman:
            schedules.append({"schedule_type": "recurring", "day_of_week": "tuesday", "date": "", "content_id": str(hanuman["_id"]), "title": "Tuesday - Hanuman Chalisa", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()})
        if gayatri:
            schedules.append({"schedule_type": "recurring", "day_of_week": "sunday", "date": "", "content_id": str(gayatri["_id"]), "title": "Sunday - Gayatri Mantra", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()})
        if shiv:
            schedules.append({"schedule_type": "recurring", "day_of_week": "monday", "date": "", "content_id": str(shiv["_id"]), "title": "Monday - Shiv Chalisa", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()})
        if schedules:
            await db.daily_schedules.insert_many(schedules)
            logger.info("Seeded Daily Schedules")

    # Update panchang with vrat info
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    day_name = datetime.now(timezone.utc).strftime("%A").lower()
    today_panchang = await db.panchang.find_one({"date": today_str})
    if today_panchang and not today_panchang.get("vrat_name"):
        vrat = await db.vrat_festivals.find_one({"recurring_day": day_name, "type": "vrat", "is_active": True})
        if vrat:
            await db.panchang.update_one({"date": today_str}, {"$set": {"vrat_name": vrat["name_hi"], "vrat_name_en": vrat["name_en"], "vrat_description": vrat["description_en"]}})

    # Seed Blog Posts
    if await db.blog_posts.count_documents({}) == 0:
        blogs = [
            {"title": "The Significance of Hanuman Chalisa in Daily Life", "slug": "significance-of-hanuman-chalisa", "excerpt": "Discover why millions recite Hanuman Chalisa daily and how it can transform your spiritual practice.", "content": "Hanuman Chalisa is one of the most revered prayers in Hinduism. Composed by Goswami Tulsidas in the 16th century, these 40 verses (chalisa) praise Lord Hanuman's devotion, strength, and wisdom.\n\nReciting Hanuman Chalisa daily brings courage, removes obstacles, and strengthens one's connection with the divine. The chalisa describes Hanuman as the ocean of wisdom and virtue who illuminates all three worlds.\n\nKey benefits of daily recitation include: mental peace, protection from negative energies, improved focus and determination, and spiritual growth.", "cover_image": "", "category": "spirituality", "tags": ["hanuman", "chalisa", "daily-practice"], "author_name": "Super Admin", "status": "published", "views": 0, "created_at": datetime.now(timezone.utc).isoformat(), "published_at": datetime.now(timezone.utc).isoformat()},
            {"title": "Understanding the Gayatri Mantra: The Mother of All Vedas", "slug": "understanding-gayatri-mantra", "excerpt": "Learn the deep meaning behind the most sacred mantra in Hindu tradition and how to practice it.", "content": "The Gayatri Mantra is considered the most powerful and sacred mantra in Hinduism, often called the Mother of all Vedas. It appears in the Rig Veda and is dedicated to Savitri, the sun deity.\n\nOm Bhur Bhuvah Svah Tat Savitur Varenyam Bhargo Devasya Dhimahi Dhiyo Yo Nah Prachodayat.\n\nMeaning: We meditate on the glory of that Supreme Being who has created the universe, who is the embodiment of knowledge and light, who is the remover of all sins and ignorance. May He enlighten our intellect.\n\nThe mantra is best chanted during Brahma Muhurta (pre-dawn), Sandhya Kaal (twilight), and sunset.", "cover_image": "", "category": "vedic-knowledge", "tags": ["gayatri", "mantra", "vedas", "meditation"], "author_name": "Super Admin", "status": "published", "views": 0, "created_at": datetime.now(timezone.utc).isoformat(), "published_at": datetime.now(timezone.utc).isoformat()},
            {"title": "Introduction to Bhagavad Gita: The Song of God", "slug": "introduction-to-bhagavad-gita", "excerpt": "A beginner's guide to understanding the Bhagavad Gita and its timeless teachings on duty, dharma, and devotion.", "content": "The Bhagavad Gita, literally meaning 'The Song of God', is a 700-verse Hindu scripture that is part of the Mahabharata. It is a dialogue between Prince Arjuna and Lord Krishna on the battlefield of Kurukshetra.\n\nThe Gita addresses fundamental questions about life, duty, and the nature of existence. Krishna teaches Arjuna about Karma Yoga (path of action), Bhakti Yoga (path of devotion), and Jnana Yoga (path of knowledge).\n\nKey teachings include: performing your duty without attachment to results, the immortality of the soul, and the importance of maintaining equanimity in success and failure.", "cover_image": "", "category": "sacred-texts", "tags": ["gita", "krishna", "philosophy"], "author_name": "Super Admin", "status": "published", "views": 0, "created_at": datetime.now(timezone.utc).isoformat(), "published_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.blog_posts.insert_many(blogs)
        logger.info("Seeded Blog Posts")

    # Seed CMS Pages
    if await db.cms_pages.count_documents({}) == 0:
        pages = [
            {"title": "About Sanatan Saathi", "slug": "about", "content": "Sanatan Saathi is a comprehensive digital spiritual companion for Sanatan Dharma. Our mission is to make Vedic knowledge accessible to everyone through technology.\n\nWe provide: Vedic Mantras, Chalisa, Ashtakam, Artis, Kathas, Sacred Texts (Bhagavad Gita, Ramayana, Mahabharata), Vedas & Puranas, and AI-powered spiritual guidance through VedaChat.\n\nOur platform supports 12+ Indian languages with Sanskrit original text, transliteration, and meanings for every verse.", "meta_description": "About Sanatan Saathi - Digital Spiritual Companion for Sanatan Dharma", "show_in_menu": True, "menu_position": "header", "sort_order": 1, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "Privacy Policy", "slug": "privacy-policy", "content": "At Sanatan Saathi, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information.\n\nWe collect: Phone number (for OTP login), usage data (for improving the app), and optional profile information. We do not sell or share your personal data with third parties.", "meta_description": "Sanatan Saathi Privacy Policy", "show_in_menu": True, "menu_position": "footer", "sort_order": 1, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "Terms of Service", "slug": "terms-of-service", "content": "By using Sanatan Saathi, you agree to these terms of service. The content provided is for spiritual and educational purposes only.", "meta_description": "Sanatan Saathi Terms of Service", "show_in_menu": True, "menu_position": "footer", "sort_order": 2, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"title": "Contact Us", "slug": "contact", "content": "Have questions or suggestions? We'd love to hear from you!\n\nEmail: contact@sanatansaathi.com\n\nFor spiritual queries, try our VedaChat AI - available on the mobile app.", "meta_description": "Contact Sanatan Saathi", "show_in_menu": True, "menu_position": "footer", "sort_order": 3, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.cms_pages.insert_many(pages)
        logger.info("Seeded CMS Pages")

    # Create indexes
    await db.admin_users.create_index("email", unique=True)
    await db.content_items.create_index("category")
    await db.content_items.create_index("slug")
    await db.content_items.create_index("status")
    await db.content_verses.create_index("item_id")
    await db.verse_meanings.create_index([("verse_id", 1), ("language", 1)])
    await db.daily_schedules.create_index("date")
    await db.daily_schedules.create_index("day_of_week")
    await db.vrat_festivals.create_index("date")
    await db.vrat_festivals.create_index("recurring_day")
    await db.otp_store.create_index("phone")
    await db.upload_logs.create_index("status")
    await db.integration_settings.create_index("key", unique=True)
    await db.analytics_events.create_index("timestamp")
    await db.analytics_events.create_index("user_id")
    await db.analytics_events.create_index("content_id")
    await db.analytics_events.create_index("event_type")
    await db.user_streaks.create_index("user_id", unique=True)
    await db.user_streaks.create_index("current_streak")
    await db.audit_trail.create_index("timestamp")
    await db.audit_trail.create_index("action")
    await db.audit_trail.create_index("admin_id")
    await db.security_events.create_index("timestamp")
    await db.security_events.create_index("ip_address")
    await db.token_blacklist.create_index("token_hash", unique=True)
    await db.blocked_ips.create_index("ip", unique=True)
    await db.blog_posts.create_index("slug", unique=True)
    await db.blog_posts.create_index("status")
    await db.cms_pages.create_index("slug", unique=True)
    await db.public_chat_limits.create_index("identifier")
    logger.info("Database indexes created")

    # Write credentials
    import pathlib
    pathlib.Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# SanatanSaathi Test Credentials\n\n")
        f.write(f"## Super Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: super_admin\n\n")
        f.write(f"## Auth Endpoints\n- POST /api/auth/admin/login\n- POST /api/auth/admin/register\n- GET /api/auth/me\n- POST /api/auth/logout\n- POST /api/auth/refresh\n")

@app.on_event("startup")
async def startup():
    await seed_data()

# ===================== IMPORT WIZARD (CSV/JSON/DOCX with Language Selection) =====================

@api_router.post("/admin/import-wizard")
async def import_wizard(
    file: UploadFile = File(...),
    category: str = Form("chalisa"),
    language: str = Form("hi"),
    content_type_tag: str = Form(""),
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Import Wizard: Bulk upload content from CSV/JSON/DOCX with language mapping."""
    fname = file.filename.lower()
    content_bytes = await file.read()
    now = datetime.now(timezone.utc).isoformat()

    log_entry = {
        "admin_id": admin["_id"],
        "file_name": file.filename,
        "file_type": fname.rsplit(".", 1)[-1] if "." in fname else "unknown",
        "category": category,
        "target_language": language,
        "status": "processing",
        "parsed_items_count": 0,
        "created_at": now,
    }
    log_result = await db.upload_logs.insert_one(log_entry)
    upload_id = str(log_result.inserted_id)

    try:
        import json as json_mod
        items = []

        if fname.endswith(".json"):
            raw = json_mod.loads(content_bytes.decode("utf-8"))
            items = raw if isinstance(raw, list) else [raw]

        elif fname.endswith(".csv"):
            import csv, io
            reader = csv.DictReader(io.StringIO(content_bytes.decode("utf-8")))
            for row in reader:
                item = {
                    "title": row.get("title", row.get("title_hi", row.get("name", ""))),
                    "sanskrit_text": row.get("sanskrit_text", row.get("text", row.get("verse", ""))),
                    "transliteration": row.get("transliteration", row.get("roman", "")),
                    "meaning": row.get("meaning", row.get(f"meaning_{language}", "")),
                    "verse_type": row.get("verse_type", "shloka"),
                    "verse_num": int(row.get("verse_num", row.get("num", 0))) if row.get("verse_num", row.get("num", "")).isdigit() else 0,
                    "deity": row.get("deity", ""),
                }
                items.append(item)

        elif fname.endswith((".docx", ".doc")):
            # Primary path: deterministic local parser (fast, no LLM, handles any size)
            from docx_parser import parse_docx_bytes
            try:
                items = parse_docx_bytes(content_bytes)
            except Exception as parse_err:
                logger.warning(f"DOCX deterministic parser failed: {parse_err}")
                items = []

            # Fallback: only call Claude if heuristic returned nothing usable
            if not items:
                import io as io_mod
                from docx import Document
                doc = Document(io_mod.BytesIO(content_bytes))
                raw_text = ""
                for para in doc.paragraphs:
                    style = para.style.name if para.style else "Normal"
                    text = para.text
                    if not text.strip():
                        raw_text += "\n"
                        continue
                    is_bold = any(run.bold for run in para.runs if run.bold)
                    is_italic = any(run.italic for run in para.runs if run.italic)
                    devanagari_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
                    has_devanagari = devanagari_chars > len(text.strip()) * 0.3
                    if "Heading 1" in style:
                        raw_text += f"\n[H1] {text}\n"
                    elif "Heading 2" in style:
                        raw_text += f"\n[H2] {text}\n"
                    elif "Heading 3" in style:
                        raw_text += f"\n[H3] {text}\n"
                    elif is_bold and has_devanagari:
                        raw_text += f"[SANSKRIT] {text}\n"
                    elif is_bold:
                        raw_text += f"[BOLD] {text}\n"
                    elif is_italic:
                        raw_text += f"[TRANSLIT] {text}\n"
                    else:
                        raw_text += f"{text}\n"

                from emergentintegrations.llm.chat import LlmChat, UserMessage
                chat = LlmChat(
                    api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
                    session_id=f"import-{upload_id}",
                    system_message=f"""You are a Hindu scripture content parser. Parse the uploaded text into structured JSON.
Rules:
- [H1] = Category name
- [H2] = Item title
- [H3] = Section header (verse type like Doha, Chaupai, Shloka)
- [SANSKRIT] = Original Sanskrit/Hindi verse text. Preserve ALL line breaks, diacritical marks, special characters (anusvara, visarga, chandrabindu, halant). NEVER truncate.
- [TRANSLIT] = Romanized transliteration
- [BOLD] = Section label or emphasis
- Normal text = Meaning or description
- Target language for meanings: {language}
- CRITICAL: Preserve 100% of the text. Do NOT truncate, abbreviate, or use "..." placeholders. For Namavali, include ALL 108 or 1008 names. Every single name must be present.
- Preserve line breaks within verses using \\n character.
Return ONLY valid JSON array:
[{{"title": "item title", "deity": "deity name", "description": "brief description",
  "verses": [{{"verse_num": 1, "verse_type": "doha|chaupai|shloka|mantra|stanza|name",
    "sanskrit_text": "full text with \\n for line breaks",
    "transliteration": "roman text",
    "meaning": "meaning in {language}"}}]
}}]""",
                )
                chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
                ai_resp = await chat.send_message(UserMessage(text=f"Parse for category '{category}', language '{language}':\n\n{raw_text}"))
                json_str = ai_resp
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0]
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0]
                items = json_mod.loads(json_str.strip())
                if not isinstance(items, list):
                    items = [items]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use .csv, .json, or .docx")

        # Normalize items into consistent structure
        normalized = []
        for item in items:
            if "verses" in item:
                # Multi-verse item
                normalized.append({
                    "title": item.get("title", item.get("title_hi", item.get("title_en", "Untitled"))),
                    "deity": item.get("deity", ""),
                    "description": item.get("description", item.get("description_hi", "")),
                    "verses": item["verses"],
                })
            else:
                # Single verse entry (from CSV)
                normalized.append({
                    "title": item.get("title", "Untitled"),
                    "deity": item.get("deity", ""),
                    "description": "",
                    "verses": [{
                        "verse_num": item.get("verse_num", 1),
                        "verse_type": item.get("verse_type", "shloka"),
                        "sanskrit_text": item.get("sanskrit_text", ""),
                        "transliteration": item.get("transliteration", ""),
                        "meaning": item.get("meaning", ""),
                    }],
                })

        await db.upload_logs.update_one(
            {"_id": ObjectId(upload_id)},
            {"$set": {
                "status": "parsed",
                "parsed_data": normalized,
                "parsed_items_count": len(normalized),
                "target_language": language,
                "total_verses": sum(len(i.get("verses", [])) for i in normalized),
            }}
        )
        return {
            "upload_id": upload_id,
            "status": "parsed",
            "target_language": language,
            "items_count": len(normalized),
            "total_verses": sum(len(i.get("verses", [])) for i in normalized),
            "parsed_data": normalized,
        }
    except Exception as e:
        logger.error(f"Import wizard error: {e}")
        await db.upload_logs.update_one({"_id": ObjectId(upload_id)}, {"$set": {"status": "error", "error_message": str(e)}})
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@api_router.post("/admin/import-wizard/publish/{upload_id}")
async def import_wizard_publish(upload_id: str, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    """Publish imported content to the database with proper multilingual mapping."""
    upload = await db.upload_logs.find_one({"_id": ObjectId(upload_id)})
    if not upload or upload["status"] != "parsed":
        raise HTTPException(status_code=400, detail="Upload not found or not parsed")

    parsed_data = upload.get("parsed_data", [])
    category = upload.get("category", "chalisa")
    language = upload.get("target_language", "hi")
    now = datetime.now(timezone.utc).isoformat()
    published = 0
    published_ids: List[str] = []

    for item_data in parsed_data:
        title = item_data.get("title", "Untitled")
        slug = title.lower().replace(" ", "-").replace("'", "").replace('"', "")[:80]
        # Check if slug exists, append number if needed
        existing = await db.content_items.find_one({"slug": slug})
        if existing:
            slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp()) % 10000}"

        content_doc = {
            "category": category,
            "slug": slug,
            "title_hi": title if language == "hi" else "",
            "title_en": title if language == "en" else "",
            "title_sa": title if language == "sa" else "",
            "deity": item_data.get("deity", ""),
            "deity_hi": item_data.get("deity", ""),
            "description_hi": item_data.get("description", "") if language == "hi" else "",
            "description_en": item_data.get("description", "") if language == "en" else "",
            "multilingual_content": {language: item_data.get("description", "")},
            "supported_languages": [language],
            "has_beginner_mode": True,
            "has_expert_mode": True,
            "total_verses": len(item_data.get("verses", [])),
            "sort_order": published + 1,
            "is_active": True,
            "is_premium": False,
            "tags": [],
            "like_count": 0,
            "status": "draft",
            "created_at": now,
            "updated_at": now,
            "created_by": admin["_id"],
        }
        result = await db.content_items.insert_one(content_doc)
        item_id = str(result.inserted_id)
        published_ids.append(item_id)

        for verse in item_data.get("verses", []):
            verse_doc = {
                "item_id": item_id,
                "verse_num": verse.get("verse_num", 1),
                "verse_type": verse.get("verse_type", "shloka"),
                "sanskrit_text": verse.get("sanskrit_text", ""),
                "transliteration": verse.get("transliteration", ""),
                "sort_order": verse.get("verse_num", 1),
                "is_active": True,
            }
            v_result = await db.content_verses.insert_one(verse_doc)
            verse_id = str(v_result.inserted_id)

            meaning = verse.get("meaning", "")
            if meaning:
                await db.verse_meanings.insert_one({
                    "verse_id": verse_id,
                    "language": language,
                    "meaning": meaning,
                    "word_breakdown": [],
                    "created_at": now,
                })
        published += 1

    await db.upload_logs.update_one(
        {"_id": ObjectId(upload_id)},
        {"$set": {"status": "published", "published_at": now, "published_item_ids": published_ids}}
    )
    return {
        "message": f"Published {published} items with {language} language mapping",
        "count": published,
        "item_ids": published_ids,
    }


# ===================== LIVE PREVIEW =====================

@api_router.get("/admin/preview/item/{item_id}")
async def live_preview_item(item_id: str, lang: str = "hi", mode: str = "beginner"):
    """Live Preview: Shows how content appears in the mobile app before publishing."""
    item = await db.content_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    verses = await db.content_verses.find({"item_id": item_id}).sort("sort_order", 1).to_list(2000)
    preview_verses = []
    for v in verses:
        verse_id = str(v["_id"])
        meaning_doc = await db.verse_meanings.find_one({"verse_id": verse_id, "language": lang})
        all_meanings = await db.verse_meanings.find({"verse_id": verse_id}).to_list(20)
        available_langs = [m["language"] for m in all_meanings]

        verse_preview = {
            "verse_num": v.get("verse_num"),
            "verse_type": v.get("verse_type", "shloka"),
            "sanskrit_text": v.get("sanskrit_text", ""),
            "transliteration": v.get("transliteration", ""),
            "meaning": meaning_doc["meaning"] if meaning_doc else "",
            "word_breakdown": meaning_doc.get("word_breakdown", []) if meaning_doc else [],
            "available_languages": available_langs,
            "has_audio": bool(v.get("audio_base64") or v.get("verse_audio_url")),
        }

        if mode == "beginner":
            verse_preview["show_word_breakdown"] = True
            verse_preview["show_transliteration"] = True
        else:
            verse_preview["show_word_breakdown"] = False
            verse_preview["show_transliteration"] = False

        preview_verses.append(verse_preview)

    return {
        "item": serialize_doc(item),
        "verses": preview_verses,
        "preview_mode": mode,
        "preview_language": lang,
        "total_verses": len(preview_verses),
        "supported_languages": item.get("supported_languages", ["hi"]),
    }


@api_router.post("/admin/preview/render")
async def live_preview_render(request: Request):
    """Render a live preview from raw data (before saving to DB)."""
    body = await request.json()
    verses = body.get("verses", [])
    lang = body.get("language", "hi")
    mode = body.get("mode", "beginner")

    preview = []
    for v in verses:
        entry = {
            "verse_num": v.get("verse_num", 0),
            "verse_type": v.get("verse_type", "shloka"),
            "sanskrit_text": v.get("sanskrit_text", ""),
            "transliteration": v.get("transliteration", ""),
            "meaning": v.get("meanings", {}).get(lang, v.get("meaning_hi", v.get("meaning", ""))),
            "show_word_breakdown": mode == "beginner",
            "show_transliteration": mode == "beginner",
        }
        preview.append(entry)

    return {
        "title": body.get("title", "Preview"),
        "verses": preview,
        "mode": mode,
        "language": lang,
    }


# ===================== MULTILINGUAL CONTENT API (for Mobile App) =====================

@api_router.get("/content/items-by-lang")
async def get_content_by_language(
    category: str = "",
    lang: str = "hi",
    skip: int = 0,
    limit: int = 50,
):
    """Get content items filtered by language support. Mobile sends Accept-Language header or lang param."""
    query = {"is_active": True, "status": "published"}
    if category:
        query["category"] = category
    if lang:
        query["supported_languages"] = lang

    items = await db.content_items.find(query).sort("sort_order", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.content_items.count_documents(query)

    result = []
    for item in items:
        doc = serialize_doc(item)
        # Return title in requested language
        if lang == "hi":
            doc["display_title"] = item.get("title_hi") or item.get("title_en", "")
        elif lang == "en":
            doc["display_title"] = item.get("title_en") or item.get("title_hi", "")
        else:
            doc["display_title"] = item.get(f"title_{lang}") or item.get("title_hi") or item.get("title_en", "")
        result.append(doc)

    return {"items": result, "total": total, "language": lang}


@api_router.get("/content/verses-by-lang/{item_id}")
async def get_verses_by_language(item_id: str, lang: str = "hi", mode: str = "beginner"):
    """Get verses with meanings in a specific language. Returns full content - NO truncation."""
    item = await db.content_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    verses = await db.content_verses.find({"item_id": item_id}).sort("sort_order", 1).to_list(2000)
    result = []
    for v in verses:
        verse_id = str(v["_id"])
        meaning_doc = await db.verse_meanings.find_one({"verse_id": verse_id, "language": lang})

        entry = {
            "id": verse_id,
            "verse_num": v.get("verse_num"),
            "verse_type": v.get("verse_type"),
            "sanskrit_text": v.get("sanskrit_text", ""),
            "transliteration": v.get("transliteration", "") if mode == "beginner" else "",
            "meaning": meaning_doc["meaning"] if meaning_doc else "",
            "word_breakdown": meaning_doc.get("word_breakdown", []) if meaning_doc and mode == "beginner" else [],
            "has_audio": bool(v.get("audio_base64") or v.get("verse_audio_url")),
        }
        result.append(entry)

    return {
        "item": serialize_doc(item),
        "verses": result,
        "language": lang,
        "mode": mode,
        "total": len(result),
    }


# ===================== MULTILINGUAL VERSE MEANING CRUD =====================

@api_router.post("/content/verses/{verse_id}/meanings")
async def add_verse_meaning(verse_id: str, request: Request, admin: dict = Depends(require_role(["super_admin", "content_admin"]))):
    """Add or update meaning for a specific language."""
    body = await request.json()
    language = body.get("language", "hi")
    meaning = body.get("meaning", "")
    word_breakdown = body.get("word_breakdown", [])

    existing = await db.verse_meanings.find_one({"verse_id": verse_id, "language": language})
    if existing:
        await db.verse_meanings.update_one(
            {"verse_id": verse_id, "language": language},
            {"$set": {"meaning": meaning, "word_breakdown": word_breakdown, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.verse_meanings.insert_one({
            "verse_id": verse_id,
            "language": language,
            "meaning": meaning,
            "word_breakdown": word_breakdown,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Update parent item's supported_languages
    verse = await db.content_verses.find_one({"_id": ObjectId(verse_id)})
    if verse and verse.get("item_id"):
        await db.content_items.update_one(
            {"_id": ObjectId(verse["item_id"])},
            {"$addToSet": {"supported_languages": language}}
        )

    return {"message": f"Meaning for '{language}' saved", "language": language}


@api_router.get("/content/verses/{verse_id}/all-meanings")
async def get_all_verse_meanings(verse_id: str):
    """Get meanings in ALL available languages for a verse."""
    meanings = await db.verse_meanings.find({"verse_id": verse_id}).to_list(20)
    result = {}
    for m in meanings:
        result[m["language"]] = {
            "meaning": m.get("meaning", ""),
            "word_breakdown": m.get("word_breakdown", []),
        }
    return {"verse_id": verse_id, "meanings": result, "available_languages": list(result.keys())}


# ===================== GRANTH HIERARCHICAL API (Book → Volume → Chapter → Verse) =====================

@api_router.get("/granth/hierarchy/{book_id}")
async def get_granth_hierarchy(book_id: str):
    """Get full hierarchy: Book → Chapters → Verse counts."""
    book = await db.granth_books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    chapters = await db.granth_chapters.find({"book_id": book_id}).sort("chapter_num", 1).to_list(500)
    hierarchy = []
    for ch in chapters:
        ch_id = str(ch["_id"])
        verse_count = await db.granth_verses.count_documents({"chapter_id": ch_id})
        hierarchy.append({
            "id": ch_id,
            "chapter_num": ch.get("chapter_num"),
            "title_hi": ch.get("title_hi", ch.get("title", {}).get("hi", "")),
            "title_en": ch.get("title_en", ch.get("title", {}).get("en", "")),
            "verse_count": verse_count,
        })

    return {
        "book": serialize_doc(book),
        "chapters": hierarchy,
        "total_chapters": len(hierarchy),
    }


@api_router.get("/granth/chapter-verses/{chapter_id}")
async def get_granth_chapter_verses(chapter_id: str, lang: str = "hi", skip: int = 0, limit: int = 100):
    """Get verses for a chapter with multilingual meanings."""
    chapter = await db.granth_chapters.find_one({"_id": ObjectId(chapter_id)})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    verses = await db.granth_verses.find({"chapter_id": chapter_id}).sort("verse_num", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.granth_verses.count_documents({"chapter_id": chapter_id})

    result = []
    for v in verses:
        doc = serialize_doc(v)
        meaning_obj = v.get("meaning", {})
        if isinstance(meaning_obj, dict):
            doc["display_meaning"] = meaning_obj.get(lang, meaning_obj.get("hi", meaning_obj.get("en", "")))
        else:
            doc["display_meaning"] = str(meaning_obj)
        result.append(doc)

    return {
        "chapter": serialize_doc(chapter),
        "verses": result,
        "total": total,
        "language": lang,
    }


# ===================== SUPPORTED LANGUAGES API =====================

@api_router.get("/languages")
async def get_supported_languages():
    """Return all supported languages for the app."""
    return [
        {"code": "sa", "name": "Sanskrit", "native": "संस्कृतम्"},
        {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
        {"code": "en", "name": "English", "native": "English"},
        {"code": "mr", "name": "Marathi", "native": "मराठी"},
        {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી"},
        {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
        {"code": "te", "name": "Telugu", "native": "తెలుగు"},
        {"code": "bn", "name": "Bengali", "native": "বাংলা"},
        {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
        {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
        {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
        {"code": "od", "name": "Odia", "native": "ଓଡ଼ିଆ"},
    ]


# ===================== KUNDLI & GRAHA MANTRA SYSTEM =====================

from kundli_engine import generate_kundli, calculate_graha_scores, get_top_recommendations, GRAHA_MANTRA_MAP, GRAHA_NAMES_HI
from dasha_engine import compute_vimshottari_dasha, get_current_dasha, interpret_current_dasha
from dosha_engine import detect_all_doshas
from d9_engine import build_navamsa_chart
from ai_interpreter import interpret_dasha, interpret_dosha

@api_router.post("/kundli/generate")
async def create_kundli(request: Request, admin: dict = Depends(get_current_admin)):
    """Generate Kundli using Swiss Ephemeris — accurate planetary positions."""
    body = await request.json()
    name = body.get("name", "")
    gender = body.get("gender", "")
    dob = body.get("dob", "")  # YYYY-MM-DD
    tob = body.get("tob", "")  # HH:MM
    place = body.get("birth_place", body.get("place", ""))

    if not all([name, dob, tob, place]):
        raise HTTPException(status_code=400, detail="name, dob (YYYY-MM-DD), tob (HH:MM), birth_place are required")

    try:
        kundli = generate_kundli(name, gender, dob, tob, place)
    except Exception as e:
        logger.error(f"Kundli generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Kundli generation failed: {str(e)}")

    # Calculate Graha scores
    scores = calculate_graha_scores(kundli["planets"])
    recommendations = get_top_recommendations(scores)

    # Compute D9 (Navamsa) chart
    asc_lon = kundli["ascendant"]["degree"]
    d9_chart = build_navamsa_chart(kundli["planets"], asc_lon)
    # Compute D7 (Saptamsa) and D10 (Dasamsa) charts
    from d7_engine import build_saptamsa_chart
    from d10_engine import build_dasamsa_chart
    d7_chart = build_saptamsa_chart(kundli["planets"], asc_lon)
    d10_chart = build_dasamsa_chart(kundli["planets"], asc_lon)

    # Compute Vimshottari Dasha (use Moon longitude)
    moon_planet = next((p for p in kundli["planets"] if p["graha"] == "Moon"), None)
    dasha_data = None
    current_dasha = None
    dasha_interpretation = None
    if moon_planet:
        # Birth datetime for dasha calculation
        from datetime import datetime as _dt
        import pytz as _pytz
        try:
            tz = _pytz.timezone(kundli["location"].get("timezone", "Asia/Kolkata"))
            year, month, day = map(int, dob.split("-"))
            hour, minute = map(int, tob.split(":"))
            birth_local = tz.localize(_dt(year, month, day, hour, minute))
            birth_utc = birth_local.astimezone(_pytz.utc)
            dasha_data = compute_vimshottari_dasha(birth_utc, moon_planet["degree"])
            current_dasha = get_current_dasha(dasha_data)
            if current_dasha:
                dasha_interpretation = interpret_current_dasha(current_dasha, scores)
        except Exception as e:
            logger.error(f"Dasha calculation error: {e}")

    # Detect Doshas
    asc_rashi_idx = int(asc_lon / 30.0)
    doshas = detect_all_doshas(kundli["planets"], asc_rashi_idx)

    now = datetime.now(timezone.utc).isoformat()

    # Save to database
    kundli_doc = {
        "user_id": admin["_id"],
        "name": name,
        "gender": gender,
        "dob": dob,
        "tob": tob,
        "birth_place": place,
        "location": kundli["location"],
        "ascendant": kundli["ascendant"],
        "planets": kundli["planets"],
        "graha_scores": scores,
        "top_recommendations": recommendations,
        "d9_chart": d9_chart,
        "dasha_data": dasha_data,
        "current_dasha": current_dasha,
        "dasha_interpretation": dasha_interpretation,
        "doshas": doshas,
        "julian_day": kundli["julian_day"],
        "created_at": now,
        "updated_at": now,
    }

    # Upsert (replace if same user has existing kundli)
    existing = await db.kundli_data.find_one({"user_id": admin["_id"]})
    if existing:
        await db.kundli_data.update_one({"_id": existing["_id"]}, {"$set": kundli_doc})
        kundli_id = str(existing["_id"])
    else:
        result = await db.kundli_data.insert_one(kundli_doc)
        kundli_id = str(result.inserted_id)

    # Save graha scores separately
    await db.graha_scores.delete_many({"kundli_id": kundli_id})
    for s in scores:
        await db.graha_scores.insert_one({
            "kundli_id": kundli_id,
            "user_id": admin["_id"],
            "graha": s["graha"],
            "graha_hi": s["graha_hi"],
            "score": s["score"],
            "priority": s["priority"],
            "reasons": s["reasons"],
            "recommendation": s["recommendation"],
            "planet_data": s["planet_data"],
            "created_at": now,
        })

    # Save daily recommendation
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.daily_recommendations.delete_many({"user_id": admin["_id"], "date": today})
    for rec in recommendations:
        await db.daily_recommendations.insert_one({
            "user_id": admin["_id"],
            "kundli_id": kundli_id,
            "graha": rec["graha"],
            "graha_hi": rec["graha_hi"],
            "score": rec["score"],
            "mantra": rec["recommendation"]["mantra"],
            "devta_hi": rec["recommendation"]["devta_hi"],
            "count": rec["recommendation"]["count"],
            "day_hi": rec["recommendation"]["day_hi"],
            "reasons": rec["reasons"],
            "date": today,
            "created_at": now,
        })

    # Seed mantras collection
    for graha, info in GRAHA_MANTRA_MAP.items():
        await db.mantras.update_one(
            {"graha": graha},
            {"$set": {"graha": graha, "graha_hi": GRAHA_NAMES_HI.get(graha, graha), **info}},
            upsert=True
        )

    return {
        "kundli_id": kundli_id,
        "ascendant": kundli["ascendant"],
        "planets": kundli["planets"],
        "graha_scores": scores,
        "recommendations": recommendations,
        "d9_chart": d9_chart,
        "d7_chart": d7_chart,
        "d10_chart": d10_chart,
        "current_dasha": current_dasha,
        "dasha_interpretation": dasha_interpretation,
        "doshas": doshas,
    }


@api_router.get("/kundli/my")
async def get_my_kundli(request: Request, admin: dict = Depends(get_current_admin)):
    """Get current user's stored Kundli data."""
    kundli = await db.kundli_data.find_one({"user_id": admin["_id"]})
    if not kundli:
        return {"kundli": None, "message": "No Kundli found. Generate one first."}
    return serialize_doc(kundli)


@api_router.post("/graha/score")
async def compute_graha_scores(request: Request, admin: dict = Depends(get_current_admin)):
    """Recompute Graha scores for existing Kundli."""
    body = await request.json()
    kundli_id = body.get("kundli_id", "")

    if kundli_id:
        kundli = await db.kundli_data.find_one({"_id": ObjectId(kundli_id)})
    else:
        kundli = await db.kundli_data.find_one({"user_id": admin["_id"]})

    if not kundli:
        raise HTTPException(status_code=404, detail="Kundli not found")

    scores = calculate_graha_scores(kundli["planets"])
    recommendations = get_top_recommendations(scores)

    return {"graha_scores": scores, "recommendations": recommendations}


@api_router.get("/recommendations/mantra")
async def get_mantra_recommendations(request: Request, admin: dict = Depends(get_current_admin)):
    """Get top 1-2 personalized mantra recommendations for today."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Check if we have today's recommendations
    recs = await db.daily_recommendations.find({"user_id": admin["_id"], "date": today}).to_list(5)
    if recs:
        return {"date": today, "recommendations": [serialize_doc(r) for r in recs]}

    # Else compute from stored kundli
    kundli = await db.kundli_data.find_one({"user_id": admin["_id"]})
    if not kundli:
        return {"date": today, "recommendations": [], "message": "Generate Kundli first"}

    scores = calculate_graha_scores(kundli["planets"])
    recommendations = get_top_recommendations(scores)

    for rec in recommendations:
        await db.daily_recommendations.insert_one({
            "user_id": admin["_id"],
            "graha": rec["graha"],
            "graha_hi": rec["graha_hi"],
            "score": rec["score"],
            "mantra": rec["recommendation"]["mantra"],
            "devta_hi": rec["recommendation"]["devta_hi"],
            "count": rec["recommendation"]["count"],
            "day_hi": rec["recommendation"]["day_hi"],
            "remedy_hi": rec["recommendation"]["remedy_hi"],
            "reasons": rec["reasons"],
            "date": today,
        })

    return {"date": today, "recommendations": [{"graha": r["graha"], "graha_hi": r["graha_hi"], "score": r["score"], "recommendation": r["recommendation"], "reasons": r["reasons"]} for r in recommendations]}


@api_router.get("/mantras/all")
async def get_all_mantras():
    """Get all Graha → Devta → Mantra mappings."""
    mantras = await db.mantras.find({}).to_list(20)
    if not mantras:
        # Seed if empty
        for graha, info in GRAHA_MANTRA_MAP.items():
            await db.mantras.insert_one({"graha": graha, "graha_hi": GRAHA_NAMES_HI.get(graha, graha), **info})
        mantras = await db.mantras.find({}).to_list(20)
    return [serialize_doc(m) for m in mantras]


# ===================== TTS (Switchable Providers) =====================

from tts_service import get_tts_provider, encode_mp3_base64
import hashlib
import asyncio

@api_router.post("/tts/synthesize")
async def synthesize_audio(request: Request, admin: dict = Depends(get_current_admin)):
    """
    Generate TTS audio for given text & language using configured provider.
    Cache by hash to avoid re-billing.
    Body: { text: str, language: "hi"|"en"|"sa"|..., voice?: str, force?: bool }
    Returns: { audio_base64, mime_type, language, provider, cached }
    """
    body = await request.json()
    text = (body.get("text") or "").strip()
    language = body.get("language", "hi")
    voice = body.get("voice")
    force = bool(body.get("force", False))

    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > 4500:
        raise HTTPException(status_code=400, detail="Text exceeds 4500 chars")

    provider_name = (await get_setting("tts_provider", "google")).lower()
    cache_key = hashlib.sha256(f"{provider_name}|{language}|{voice or ''}|{text}".encode("utf-8")).hexdigest()

    # Check cache
    if not force:
        cached = await db.tts_cache.find_one({"key": cache_key})
        if cached:
            return {
                "audio_base64": cached["audio_base64"],
                "mime_type": "audio/mpeg",
                "language": language,
                "provider": provider_name,
                "cached": True,
            }

    # Generate
    try:
        provider = await get_tts_provider(get_setting)
        loop = asyncio.get_event_loop()
        audio_bytes = await loop.run_in_executor(None, lambda: provider.synthesize(text, language, voice))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"TTS synthesize error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

    audio_b64 = encode_mp3_base64(audio_bytes)

    # Save cache (limit doc size — 16MB Mongo limit; mantras are small)
    try:
        await db.tts_cache.update_one(
            {"key": cache_key},
            {"$set": {
                "key": cache_key,
                "audio_base64": audio_b64,
                "language": language,
                "provider": provider_name,
                "text_preview": text[:80],
                "voice": voice or "",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"TTS cache save skipped: {e}")

    return {
        "audio_base64": audio_b64,
        "mime_type": "audio/mpeg",
        "language": language,
        "provider": provider_name,
        "cached": False,
    }


@api_router.get("/tts/providers")
async def list_tts_providers():
    return {
        "providers": ["google", "openai", "elevenlabs"],
        "current": (await get_setting("tts_provider", "google")).lower(),
        "languages": list({"hi","en","sa","ta","te","bn","mr","gu","kn","ml","pa","od"}),
    }


# ===================== NOTIFICATIONS (Daily / Weekly Mantra Reminders) =====================

DAY_TO_GRAHA = {
    0: "Moon", 1: "Mars", 2: "Mercury", 3: "Jupiter",
    4: "Venus", 5: "Saturn", 6: "Sun",  # Mon..Sun (weekday())
}

@api_router.get("/notifications/today")
async def get_today_notifications(admin: dict = Depends(get_current_admin)):
    """
    Build today's notifications:
      - Top recommendation from kundli (highest affliction)
      - Day-based reminder (e.g., Saturday → Shani)
    Returns multilingual content.
    """
    today_dt = datetime.now(timezone.utc)
    today_str = today_dt.strftime("%Y-%m-%d")
    weekday = today_dt.weekday()
    day_graha = DAY_TO_GRAHA[weekday]

    notifications = []

    # 1. Day-based reminder (always available)
    day_info = GRAHA_MANTRA_MAP.get(day_graha, {})
    notifications.append({
        "type": "day_based",
        "graha": day_graha,
        "graha_hi": GRAHA_NAMES_HI.get(day_graha, day_graha),
        "title_hi": f"आज {day_info.get('day_hi','')} है — {GRAHA_NAMES_HI.get(day_graha,'')} का दिन",
        "title_en": f"Today is {day_info.get('day','')} — {day_graha}'s day",
        "mantra": day_info.get("mantra", ""),
        "mantra_en": day_info.get("mantra_en", ""),
        "count": day_info.get("count", 108),
        "remedy_hi": day_info.get("remedy_hi", ""),
        "remedy_en": day_info.get("remedy_en", ""),
        "devta_hi": day_info.get("devta_hi", ""),
        "color_hi": day_info.get("color_hi", ""),
        "date": today_str,
    })

    # 2. Personalised (from kundli) — top recommendation
    kundli = await db.kundli_data.find_one({"user_id": admin["_id"]})
    if kundli and kundli.get("top_recommendations"):
        for rec in kundli["top_recommendations"][:1]:
            r = rec["recommendation"]
            notifications.append({
                "type": "personalised",
                "graha": rec["graha"],
                "graha_hi": rec["graha_hi"],
                "title_hi": f"आपकी कुंडली के अनुसार {rec['graha_hi']} शान्ति आवश्यक",
                "title_en": f"Per your Kundli: {rec['graha']} shanti is recommended",
                "mantra": r.get("mantra", ""),
                "mantra_en": r.get("mantra_en", ""),
                "count": r.get("count", 108),
                "remedy_hi": r.get("remedy_hi", ""),
                "remedy_en": r.get("remedy_en", ""),
                "devta_hi": r.get("devta_hi", ""),
                "color_hi": r.get("color_hi", ""),
                "score": rec.get("score", 0),
                "reasons": rec.get("reasons", []),
                "date": today_str,
            })

    # Persist for audit / mobile push
    try:
        await db.notifications.update_one(
            {"user_id": admin["_id"], "date": today_str},
            {"$set": {
                "user_id": admin["_id"],
                "date": today_str,
                "items": notifications,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    except Exception:
        pass

    return {"date": today_str, "weekday": weekday, "notifications": notifications}


# ===================== DASHA / DOSHA / CHARTS / AI INSIGHTS =====================

async def _load_user_kundli(user_id):
    return await db.kundli_data.find_one({"user_id": user_id})


@api_router.get("/dasha/current")
async def api_current_dasha(admin: dict = Depends(get_current_admin)):
    """Return current Mahadasha + Antardasha + Pratyantardasha + rule-based interpretation."""
    kundli = await _load_user_kundli(admin["_id"])
    if not kundli:
        raise HTTPException(status_code=404, detail="No Kundli found. Generate one first.")

    if not kundli.get("dasha_data"):
        raise HTTPException(status_code=500, detail="Dasha data missing — regenerate Kundli")

    # Always recompute current dasha fresh (cheap) so pratyantardasha is up-to-date
    current = get_current_dasha(kundli["dasha_data"])
    if not current:
        return {"current_dasha": None, "interpretation": None, "cached": False}
    interp = kundli.get("dasha_interpretation") or interpret_current_dasha(current, kundli.get("graha_scores", []))
    await db.kundli_data.update_one(
        {"_id": kundli["_id"]},
        {"$set": {"current_dasha": current, "dasha_interpretation": interp,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"current_dasha": current, "interpretation": interp, "cached": False}


@api_router.get("/yogas")
async def api_detect_yogas(admin: dict = Depends(get_current_admin)):
    """Rule-based yoga detection — Raj, Dhan, Gaj Kesari, Chandra-Mangal, Neech Bhang Raj."""
    from yoga_engine import detect_all_yogas
    kundli = await _load_user_kundli(admin["_id"])
    if not kundli:
        raise HTTPException(status_code=404, detail="No Kundli found. Generate one first.")
    if not kundli.get("planets") or not kundli.get("ascendant"):
        raise HTTPException(status_code=500, detail="Kundli incomplete — regenerate")
    asc_idx = kundli["ascendant"].get("rashi_idx")
    if asc_idx is None:
        asc_idx = int((kundli["ascendant"].get("degree", 0) or 0) / 30)
    return detect_all_yogas(kundli["planets"], {"rashi_idx": asc_idx})


@api_router.post("/dasha/interpret")
async def api_dasha_interpret_ai(request: Request, admin: dict = Depends(get_current_admin)):
    """AI Hybrid Layer: Convert structured dasha output → 2-4 line Hindi explanation."""
    body = await request.json()
    language = body.get("language", "hi")

    kundli = await _load_user_kundli(admin["_id"])
    if not kundli or not kundli.get("current_dasha"):
        raise HTTPException(status_code=404, detail="No current Dasha found. Generate Kundli first.")

    interp = kundli.get("dasha_interpretation")
    if not interp:
        interp = interpret_current_dasha(kundli["current_dasha"], kundli.get("graha_scores", []))

    # Cached AI explanation per language
    cache_key = f"dasha_ai_{language}"
    cached_ai = (kundli.get("ai_cache") or {}).get(cache_key)
    if cached_ai:
        return {"interpretation": interp, "ai_explanation": cached_ai, "language": language, "cached": True}

    ai_text = await interpret_dasha(interp, kundli["current_dasha"], language=language)

    # Save to cache
    ai_cache = kundli.get("ai_cache", {}) or {}
    ai_cache[cache_key] = ai_text
    await db.kundli_data.update_one({"_id": kundli["_id"]}, {"$set": {"ai_cache": ai_cache}})

    return {"interpretation": interp, "ai_explanation": ai_text, "language": language, "cached": False}


@api_router.get("/dosha/detect")
async def api_dosha_detect(admin: dict = Depends(get_current_admin)):
    """Return Mangal/Kaal Sarp/Sade Sati doshas."""
    kundli = await _load_user_kundli(admin["_id"])
    if not kundli:
        raise HTTPException(status_code=404, detail="No Kundli found")

    if kundli.get("doshas"):
        return {"doshas": kundli["doshas"], "cached": True}

    asc_rashi_idx = int(kundli["ascendant"]["degree"] / 30.0)
    doshas = detect_all_doshas(kundli["planets"], asc_rashi_idx)
    await db.kundli_data.update_one({"_id": kundli["_id"]}, {"$set": {"doshas": doshas}})
    return {"doshas": doshas, "cached": False}


@api_router.post("/dosha/interpret")
async def api_dosha_interpret_ai(request: Request, admin: dict = Depends(get_current_admin)):
    """AI explanation for a specific dosha type."""
    body = await request.json()
    dosha_type = body.get("dosha_type", "")  # mangal_dosha | kaal_sarp_dosha | sade_sati
    language = body.get("language", "hi")

    kundli = await _load_user_kundli(admin["_id"])
    if not kundli or not kundli.get("doshas"):
        raise HTTPException(status_code=404, detail="Doshas not detected — generate Kundli first")

    dosha = kundli["doshas"].get(dosha_type)
    if not dosha:
        raise HTTPException(status_code=400, detail=f"Unknown dosha type: {dosha_type}")

    cache_key = f"dosha_{dosha_type}_{language}"
    cached_ai = (kundli.get("ai_cache") or {}).get(cache_key)
    if cached_ai:
        return {"dosha": dosha, "ai_explanation": cached_ai, "cached": True}

    ai_text = await interpret_dosha(dosha, dosha_type, language=language)

    ai_cache = kundli.get("ai_cache", {}) or {}
    ai_cache[cache_key] = ai_text
    await db.kundli_data.update_one({"_id": kundli["_id"]}, {"$set": {"ai_cache": ai_cache}})
    return {"dosha": dosha, "ai_explanation": ai_text, "cached": False}


@api_router.get("/charts/d1-d9")
async def api_charts(admin: dict = Depends(get_current_admin)):
    """Return D1 (Lagna) + D9 (Navamsa) + D7 (Saptamsa) + D10 (Dasamsa) chart data for SVG rendering."""
    from d7_engine import build_saptamsa_chart
    from d10_engine import build_dasamsa_chart

    kundli = await _load_user_kundli(admin["_id"])
    if not kundli:
        raise HTTPException(status_code=404, detail="No Kundli found")

    asc_lon = kundli["ascendant"]["degree"]
    asc_idx = int(asc_lon / 30.0)
    d1 = {
        "ascendant": {"rashi_idx": asc_idx, "rashi": kundli["ascendant"]["rashi"],
                      "rashi_hi": kundli["ascendant"]["rashi_hi"]},
        "planets": [{
            "graha": p["graha"], "graha_hi": p["graha_hi"],
            "rashi_idx": p["rashi_idx"], "rashi": p["rashi"], "rashi_hi": p["rashi_hi"],
            "house": p["house"], "is_retrograde": p["is_retrograde"],
            "degree_in_sign": p.get("degree", 0) - int(p.get("degree", 0) / 30.0) * 30.0,
        } for p in kundli["planets"]],
    }

    d9 = kundli.get("d9_chart") or build_navamsa_chart(kundli["planets"], asc_lon)
    d7 = build_saptamsa_chart(kundli["planets"], asc_lon)
    d10 = build_dasamsa_chart(kundli["planets"], asc_lon)
    return {"d1": d1, "d9": d9, "d7": d7, "d10": d10}


@api_router.get("/charts/all")
async def api_charts_all(admin: dict = Depends(get_current_admin)):
    """Alias of /charts/d1-d9 returning all available divisional charts."""
    return await api_charts(admin)


@api_router.get("/insights/today")
async def api_insights_today(admin: dict = Depends(get_current_admin)):
    """
    Combined daily insights — Dasha + top remedy + dosha-aware notification.
    Aggregates structured rule output + (optional) AI explanation.
    """
    kundli = await _load_user_kundli(admin["_id"])
    if not kundli:
        return {"available": False, "message": "No Kundli — generate one first."}

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Dasha
    current_dasha = kundli.get("current_dasha")
    dasha_interp = kundli.get("dasha_interpretation")

    # Active doshas (only severe ones)
    doshas = kundli.get("doshas", {}) or {}
    active_doshas = []
    for k, d in doshas.items():
        if d.get("present") and d.get("severity") in ("MEDIUM", "HIGH"):
            active_doshas.append({
                "type": k,
                "type_hi": {"mangal_dosha": "मंगल दोष", "kaal_sarp_dosha": "काल सर्प दोष", "sade_sati": "साढ़े साती"}.get(k, k),
                "severity": d.get("severity"),
                "severity_hi": d.get("severity_hi"),
                "explanation_hi": d.get("explanation_hi"),
                "explanation_en": d.get("explanation_en"),
            })

    # Top recommended mantra
    top_recs = (kundli.get("top_recommendations") or [])[:1]

    return {
        "available": True,
        "date": today_str,
        "current_dasha": current_dasha,
        "dasha_interpretation": dasha_interp,
        "active_doshas": active_doshas,
        "top_recommendation": top_recs[0] if top_recs else None,
    }


# ===================== MOBILE-FRIENDLY ENDPOINTS =====================

from mobile_extras import compute_today_panchang, start_notification_scheduler

@api_router.get("/mobile/panchang/today")
async def mobile_panchang_today(lat: float = 28.6139, lon: float = 77.2090, tz: str = "Asia/Kolkata"):
    """Public daily Panchang (no auth) — Tithi/Nakshatra/Yoga/Karana via Swiss Ephemeris."""
    try:
        return compute_today_panchang(lat=lat, lon=lon, tz_name=tz)
    except Exception as e:
        logger.error(f"Panchang error: {e}")
        raise HTTPException(status_code=500, detail=f"Panchang failed: {e}")


@api_router.get("/mobile/mantra-of-day")
async def mobile_mantra_of_day():
    """Public day-based mantra (no auth) — Tuesday→Mars/Hanuman etc."""
    today_dt = datetime.now(timezone.utc)
    weekday = today_dt.weekday()
    day_to_graha = {0:"Moon",1:"Mars",2:"Mercury",3:"Jupiter",4:"Venus",5:"Saturn",6:"Sun"}
    day_graha = day_to_graha[weekday]
    info = GRAHA_MANTRA_MAP.get(day_graha, {})
    return {
        "graha": day_graha,
        "graha_hi": GRAHA_NAMES_HI.get(day_graha, day_graha),
        "devta_hi": info.get("devta_hi", ""),
        "mantra": info.get("mantra", ""),
        "mantra_en": info.get("mantra_en", ""),
        "count": info.get("count", 108),
        "day_hi": info.get("day_hi", ""),
        "color_hi": info.get("color_hi", ""),
        "remedy_hi": info.get("remedy_hi", ""),
        "remedy_en": info.get("remedy_en", ""),
        "date": today_dt.strftime("%Y-%m-%d"),
    }


# ===================== AI TRANSLATION (Gemini) — Phase 1 Multilingual Editor =====================
# All AI output is stored as DRAFT in `verse_translation_drafts` and never auto-published.
from translation_service import (
    translate_text as _gemini_translate_text,
    translate_verse as _gemini_translate_verse,
    LANGUAGE_NAMES as _SUPPORTED_LANG_NAMES,
)

class TranslateTextReq(BaseModel):
    text: str
    source_language: str = "hi"
    target_languages: List[str]
    context_label: Optional[str] = None
    model: Optional[str] = None

@api_router.post("/admin/translate/text")
async def admin_translate_text(
    req: TranslateTextReq,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    try:
        result = await _gemini_translate_text(
            source_text=req.text,
            source_language=req.source_language,
            target_languages=req.target_languages,
            context_label=req.context_label,
            model=req.model or "gemini-2.5-flash",
        )
        return {"translations": result, "source_language": req.source_language}
    except Exception as e:
        logger.exception("Gemini translate_text failed")
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")


class TranslateVerseReq(BaseModel):
    source_language: str = "hi"
    target_languages: List[str]
    text: Optional[str] = None
    transliteration: Optional[str] = None
    meaning: Optional[str] = None
    verse_id: Optional[str] = None  # if provided, drafts are saved automatically
    model: Optional[str] = None

@api_router.post("/admin/translate/verse")
async def admin_translate_verse(
    req: TranslateVerseReq,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    try:
        result = await _gemini_translate_verse(
            source_language=req.source_language,
            target_languages=req.target_languages,
            text=req.text,
            transliteration=req.transliteration,
            meaning=req.meaning,
            model=req.model or "gemini-2.5-flash",
        )
    except Exception as e:
        logger.exception("Gemini translate_verse failed")
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

    saved_ids = []
    if req.verse_id:
        now = datetime.now(timezone.utc).isoformat()
        for lang_code, fields in result.items():
            doc = {
                "verse_id": req.verse_id,
                "language": lang_code,
                "text": fields.get("text", ""),
                "transliteration": fields.get("transliteration", ""),
                "meaning": fields.get("meaning", ""),
                "is_ai_generated": True,
                "is_draft": True,
                "source_language": req.source_language,
                "model": req.model or "gemini-2.5-flash",
                "created_by": admin["_id"],
                "created_at": now,
                "updated_at": now,
            }
            res = await db.verse_translation_drafts.update_one(
                {"verse_id": req.verse_id, "language": lang_code, "is_draft": True},
                {"$set": doc},
                upsert=True,
            )
            saved_ids.append(lang_code)

    return {"translations": result, "saved_drafts": saved_ids}


@api_router.get("/admin/translate/drafts/{verse_id}")
async def admin_get_drafts(
    verse_id: str,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    drafts = await db.verse_translation_drafts.find(
        {"verse_id": verse_id}
    ).to_list(50)
    return [serialize_doc(d) for d in drafts]


class DraftUpdateReq(BaseModel):
    text: Optional[str] = None
    transliteration: Optional[str] = None
    meaning: Optional[str] = None

@api_router.put("/admin/translate/drafts/{verse_id}/{language}")
async def admin_update_draft(
    verse_id: str,
    language: str,
    req: DraftUpdateReq,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    if language not in _SUPPORTED_LANG_NAMES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["is_draft"] = True
    await db.verse_translation_drafts.update_one(
        {"verse_id": verse_id, "language": language, "is_draft": True},
        {"$set": {**update, "verse_id": verse_id, "language": language, "is_ai_generated": False}},
        upsert=True,
    )
    doc = await db.verse_translation_drafts.find_one(
        {"verse_id": verse_id, "language": language, "is_draft": True}
    )
    return serialize_doc(doc) if doc else {}


@api_router.post("/admin/translate/drafts/{verse_id}/{language}/publish")
async def admin_publish_draft(
    verse_id: str,
    language: str,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Publish an editable draft into the live `verse_meanings` (meaning) and `content_verses`
    multilingual fields (text + transliteration). Marks the draft as published."""
    if language not in _SUPPORTED_LANG_NAMES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    draft = await db.verse_translation_drafts.find_one(
        {"verse_id": verse_id, "language": language, "is_draft": True}
    )
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    now = datetime.now(timezone.utc).isoformat()

    # Save meaning into verse_meanings (existing schema, per-language)
    meaning_text = (draft.get("meaning") or "").strip()
    if meaning_text:
        existing = await db.verse_meanings.find_one({"verse_id": verse_id, "language": language})
        if existing:
            await db.verse_meanings.update_one(
                {"_id": existing["_id"]},
                {"$set": {"meaning": meaning_text, "word_breakdown": existing.get("word_breakdown", []), "updated_at": now}},
            )
        else:
            await db.verse_meanings.insert_one({
                "verse_id": verse_id,
                "language": language,
                "meaning": meaning_text,
                "word_breakdown": [],
                "created_at": now,
            })

    # Save text + transliteration into content_verses as multilingual maps (additive)
    set_doc = {"updated_at": now}
    text_val = (draft.get("text") or "").strip()
    trans_val = (draft.get("transliteration") or "").strip()
    if text_val:
        set_doc[f"text_translations.{language}"] = text_val
    if trans_val:
        set_doc[f"transliteration_translations.{language}"] = trans_val
    if len(set_doc) > 1:
        try:
            await db.content_verses.update_one({"_id": ObjectId(verse_id)}, {"$set": set_doc})
        except Exception:
            # Some legacy verse ids might be granth_verses
            await db.granth_verses.update_one({"_id": ObjectId(verse_id)}, {"$set": set_doc})

    await db.verse_translation_drafts.update_one(
        {"_id": draft["_id"]},
        {"$set": {"is_draft": False, "published_at": now, "published_by": admin["_id"]}},
    )
    return {"message": f"Published {language}", "verse_id": verse_id, "language": language}


@api_router.delete("/admin/translate/drafts/{verse_id}/{language}")
async def admin_delete_draft(
    verse_id: str,
    language: str,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    res = await db.verse_translation_drafts.delete_one(
        {"verse_id": verse_id, "language": language, "is_draft": True}
    )
    return {"deleted": res.deleted_count}


@api_router.get("/admin/translate/languages")
async def admin_supported_languages(
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    return {"languages": [{"code": k, "name": v} for k, v in _SUPPORTED_LANG_NAMES.items()]}


# ===================== PANCHANG v2 + DHARMA ENGINE =====================
from panchang_engine import compute_panchang as _compute_panchang
from festival_engine import detect_festivals as _detect_festivals
from dharma_engine import build_dharma_guidance as _build_dharma


@api_router.get("/panchang/day")
async def api_panchang_day(
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz: str = "Asia/Kolkata",
    date: Optional[str] = None,          # YYYY-MM-DD
    system: str = "north",               # "north" | "south"
):
    """Public — comprehensive Panchang for a location + date.
    Caches per (date, lat-rounded, lon-rounded, system)."""
    cache_key = f"{date or 'today'}:{round(lat, 2)}:{round(lon, 2)}:{tz}:{system}"
    cached = await db.panchang_cache.find_one({"_id": cache_key})
    if cached and cached.get("expires_at") and \
       datetime.fromisoformat(cached["expires_at"]) > datetime.now(timezone.utc):
        cached.pop("_id", None); cached.pop("expires_at", None)
        return cached
    try:
        p = _compute_panchang(lat=lat, lon=lon, tz_name=tz, for_date=date, system=system)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Panchang calc failed: {e}")
    p["festivals"] = _detect_festivals(p)
    # Cache for 12h
    try:
        expires_dt = datetime.now(timezone.utc) + timedelta(hours=12)
        await db.panchang_cache.update_one(
            {"_id": cache_key},
            {"$set": {**p, "expires_at": expires_dt.isoformat(), "expires_at_dt": expires_dt}},
            upsert=True,
        )
    except Exception:
        pass  # non-fatal
    return p


@api_router.get("/dharma/today")
async def api_dharma_today(
    request: Request,
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz: str = "Asia/Kolkata",
    system: str = "north",
):
    """Personalized daily dharma guidance.

    - If caller is authenticated (admin or mobile user), pulls their kundli
      for personalised rules (weak planets + current Mahadasha).
    - Works anonymously too (returns panchang-only rules).
    """
    user = None
    # Try admin first, then mobile user, else anonymous
    try:
        user = await get_current_admin(request)
    except HTTPException:
        try:
            user = await get_current_app_user(request)
        except HTTPException:
            user = None  # anonymous call

    panchang = _compute_panchang(lat=lat, lon=lon, tz_name=tz, system=system)
    festivals = _detect_festivals(panchang)

    kundli = None
    if user:
        kundli = await _load_user_kundli(user["_id"])

    guidance = _build_dharma(panchang, kundli, festivals, top_n=5)
    return {
        "panchang": panchang,
        "festivals": festivals,
        **guidance,
        "user_id": user["_id"] if user else None,
    }


# ===================== MOBILE USER AUTH =====================
# Separate collection (`app_users`) and JWT role ("user") so admin and end-user
# tokens never cross-pollinate. Mobile clients send `Authorization: Bearer <token>`.

class MobileSignupReq(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None

class MobileLoginReq(BaseModel):
    email: str
    password: str


async def get_current_app_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if await is_token_blacklisted(token):
        raise HTTPException(status_code=401, detail="Token revoked")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        if payload.get("role") != "user":
            raise HTTPException(status_code=401, detail="Not a mobile user token")
        user = await db.app_users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return serialize_doc(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/auth/mobile/signup")
async def mobile_signup(req: MobileSignupReq, request: Request):
    email = (req.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name or len(req.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name required")
    existing = await db.app_users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "email": email,
        "name": req.name.strip(),
        "phone": (req.phone or "").strip() or None,
        "password_hash": hash_password(req.password),
        "role": "user",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.app_users.insert_one(doc)
    user_id = str(res.inserted_id)
    token = create_access_token(user_id, email, "user")
    refresh = create_refresh_token(user_id)
    return {
        "token": token,
        "refresh_token": refresh,
        "user": {"_id": user_id, "email": email, "name": doc["name"], "phone": doc["phone"], "role": "user"},
    }


@api_router.post("/auth/mobile/login")
async def mobile_login(req: MobileLoginReq, request: Request):
    email = (req.email or "").strip().lower()
    ip = get_client_ip(request)
    # Brute force protection (reuse admin login_attempts logic if present, simple variant otherwise)
    identifier = f"{ip}:{email}:mobile"
    now = datetime.now(timezone.utc)
    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempt_doc and attempt_doc.get("locked_until"):
        locked_until = attempt_doc["locked_until"]
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until > now:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    user = await db.app_users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        # Bump attempts
        attempts = (attempt_doc or {}).get("count", 0) + 1
        update = {"identifier": identifier, "count": attempts, "last_attempt_at": now.isoformat()}
        if attempts >= 5:
            update["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one(
            {"identifier": identifier}, {"$set": update}, upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    # Reset attempts
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    token = create_access_token(user_id, email, "user")
    refresh = create_refresh_token(user_id)
    await db.app_users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": now.isoformat(), "last_login_ip": ip}}
    )
    return {
        "token": token,
        "refresh_token": refresh,
        "user": {
            "_id": user_id, "email": email, "name": user.get("name"),
            "phone": user.get("phone"), "role": "user",
        },
    }


@api_router.get("/auth/mobile/me")
async def mobile_me(user: dict = Depends(get_current_app_user)):
    return {
        "_id": user["_id"], "email": user["email"], "name": user.get("name"),
        "phone": user.get("phone"), "role": "user",
        "preferred_language": user.get("preferred_language", "hi"),
        "created_at": user.get("created_at"), "last_login_at": user.get("last_login_at"),
    }


@api_router.put("/auth/mobile/settings")
async def mobile_update_settings(request: Request, user: dict = Depends(get_current_app_user)):
    """Update user settings like preferred_language (stored on app_users doc)."""
    body = await request.json()
    allowed = {}
    if "preferred_language" in body:
        lang = str(body["preferred_language"])
        if lang not in {"hi", "en", "sa", "mr", "gu", "ta", "te", "bn"}:
            raise HTTPException(status_code=400, detail="Unsupported language")
        allowed["preferred_language"] = lang
    if "name" in body and isinstance(body["name"], str):
        allowed["name"] = body["name"][:120]
    if not allowed:
        raise HTTPException(status_code=400, detail="No updatable fields")
    allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.app_users.update_one({"_id": ObjectId(user["_id"])}, {"$set": allowed})
    return {"message": "Settings updated", **allowed}


@api_router.post("/auth/mobile/logout")
async def mobile_logout(request: Request, user: dict = Depends(get_current_app_user)):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        await blacklist_token(auth_header[7:])
    return {"message": "Logged out"}


# ===================== MOBILE USER AUTH END =====================


# ===================== AUDIO-TEXT SYNCHRONIZATION (Phase 2) =====================
import shutil
from pathlib import Path as _Path
from audio_sync_service import parse_sync_file

AUDIO_STATIC_DIR = _Path("/app/backend/static/audio/items")
AUDIO_STATIC_DIR.mkdir(parents=True, exist_ok=True)


@api_router.post("/content/items/{item_id}/audio")
async def upload_item_audio(
    item_id: str,
    audio: UploadFile = File(...),
    sync_file: Optional[UploadFile] = File(None),
    sync_format: Optional[str] = Form(None),  # 'lrc' | 'json' (auto-detected from filename when None)
    duration_ms: Optional[int] = Form(None),
    variant_label: Optional[str] = Form(None),  # e.g. "Male", "Female", "Slow", "Fast"
    variant_slot: Optional[int] = Form(None),   # 1..4 (Expert Mode slot). When None, primary audio.
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Upload (or replace) an audio file + optional sync map for a content item.

    Two modes:
      - Primary (variant_slot=None): Stored at /app/backend/static/audio/items/{item_id}.{ext}
        and set as the default audio. Mirror-saves the sync_map onto the primary slot.
      - Expert variant (variant_slot=1..4): Stored at items/{item_id}_v{slot}.{ext}
        with a label (e.g. "Male", "Female"). The primary sync_map is shared by all variants.
    """
    # Validate item exists
    item_doc, item_coll, _vcoll = await _resolve_item_collections(item_id)
    if not item_doc:
        raise HTTPException(status_code=404, detail="Item not found")

    # Save audio
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file required")
    ext = (audio.filename.rsplit('.', 1)[-1] or 'mp3').lower()
    if ext not in {"mp3", "m4a", "wav", "ogg", "aac"}:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: .{ext}")

    is_variant = variant_slot is not None
    if is_variant:
        try:
            slot = int(variant_slot)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="variant_slot must be 1..4")
        if slot < 1 or slot > 4:
            raise HTTPException(status_code=400, detail="variant_slot must be 1..4")
        target_path = AUDIO_STATIC_DIR / f"{item_id}_v{slot}.{ext}"
    else:
        target_path = AUDIO_STATIC_DIR / f"{item_id}.{ext}"

    # Save file bytes (with a 25MB safety cap to prevent disk exhaustion)
    MAX_AUDIO_BYTES = 25 * 1024 * 1024
    written = 0
    with target_path.open("wb") as f:
        while True:
            chunk = await audio.read(1024 * 64)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_AUDIO_BYTES:
                f.close()
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Audio file too large (max 25 MB)")
            f.write(chunk)

    # Parse sync file if provided (only meaningful on primary upload)
    sync_map: List[Dict[str, Any]] = []
    if sync_file is not None and sync_file.filename:
        sync_bytes = await sync_file.read()
        try:
            sync_map = parse_sync_file(sync_file.filename, sync_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Sync file parse error: {e}")
        # Backfill last verse's end_ms from duration if known
        if sync_map and sync_map[-1].get("end_ms") is None and duration_ms:
            sync_map[-1]["end_ms"] = int(duration_ms)

    now = datetime.now(timezone.utc).isoformat()

    if is_variant:
        slot = int(variant_slot)
        variant_url = f"/api/audio-static/items/{item_id}_v{slot}.{ext}"
        label = variant_label or f"Variant {slot}"
        # Fetch existing audio_sync to merge variants
        existing = (item_doc.get("audio_sync") or {})
        variants = list(existing.get("variants") or [])
        # Replace or append slot
        variants = [v for v in variants if int(v.get("slot", 0)) != slot]
        variants.append({
            "slot": slot,
            "label": label,
            "url": variant_url,
            "format": ext,
            "duration_ms": int(duration_ms) if duration_ms else None,
            "uploaded_at": now,
        })
        variants.sort(key=lambda v: v["slot"])
        await db[item_coll].update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"audio_sync.variants": variants, "updated_at": now}}
        )
        return {"message": f"Variant {slot} uploaded", "variant_url": variant_url, "variants": variants}

    # Primary upload — also preserves existing variants
    existing = (item_doc.get("audio_sync") or {})
    existing_variants = list(existing.get("variants") or [])
    audio_url = f"/api/audio-static/items/{item_id}.{ext}"
    audio_meta = {
        "audio_url": audio_url,
        "sync_map": sync_map or existing.get("sync_map", []),
        "duration_ms": duration_ms if duration_ms is not None else existing.get("duration_ms"),
        "format": ext,
        "variants": existing_variants,
        "uploaded_at": now,
        "uploaded_by": admin["_id"],
    }
    await db[item_coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"audio_sync": audio_meta, "audio_url": audio_url, "updated_at": now}}
    )
    return {
        "message": "Audio uploaded",
        "audio_url": audio_url,
        "sync_verses": len(audio_meta["sync_map"]),
        "variants": existing_variants,
    }


@api_router.delete("/content/items/{item_id}/audio/variants/{slot}")
async def delete_item_audio_variant(
    item_id: str,
    slot: int,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Delete a specific Expert-mode audio variant (slot 1..4)."""
    if slot < 1 or slot > 4:
        raise HTTPException(status_code=400, detail="slot must be 1..4")
    item, item_coll, _vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    variants = list((item.get("audio_sync") or {}).get("variants") or [])
    removed = [v for v in variants if int(v.get("slot", 0)) == slot]
    kept = [v for v in variants if int(v.get("slot", 0)) != slot]
    for v in removed:
        fmt = v.get("format", "mp3")
        p = AUDIO_STATIC_DIR / f"{item_id}_v{slot}.{fmt}"
        if p.exists():
            try:
                p.unlink()
            except Exception:
                pass
    await db[item_coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"audio_sync.variants": kept, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Variant {slot} removed", "variants": kept}


@api_router.post("/content/items/{item_id}/audio/sync")
async def update_item_sync_map(
    item_id: str,
    request: Request,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    """Update only the sync_map (line-level) for an item's audio. Accepts strict nested JSON.

    Body: {audio_file?, duration_ms?, verses: [{verse_id, start_ms, end_ms, lines:[...]}]}
    or legacy: [{verse_num, start_ms, end_ms, text, lines?}]
    """
    item, item_coll, _vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    body = await request.json()
    try:
        if isinstance(body, dict) and isinstance(body.get("verses"), list) \
                and body["verses"] and isinstance(body["verses"][0], dict) \
                and "lines" in body["verses"][0]:
            from audio_sync_service import parse_nested_json_sync
            sync_map = parse_nested_json_sync(body)
            duration_ms = body.get("duration_ms")
        else:
            from audio_sync_service import parse_json_sync
            sync_map = parse_json_sync(body)
            duration_ms = None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sync parse error: {e}")

    existing = (item.get("audio_sync") or {})
    now = datetime.now(timezone.utc).isoformat()
    new_meta = {
        **existing,
        "sync_map": sync_map,
        "duration_ms": duration_ms if duration_ms is not None else existing.get("duration_ms"),
        "updated_at": now,
    }
    await db[item_coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"audio_sync": new_meta, "updated_at": now}}
    )
    return {"message": "Sync map updated", "sync_verses": len(sync_map)}


@api_router.get("/content/items/{item_id}/audio")
async def get_item_audio(item_id: str):
    """Public endpoint — mobile fetches audio_url + sync_map for playback + verse highlighting."""
    item, _coll, _vcoll = await _resolve_item_collections(item_id)
    if not item or not item.get("audio_sync"):
        return {"audio_url": None, "sync_map": [], "duration_ms": None}
    audio = item["audio_sync"]
    audio.pop("_id", None)
    return audio


@api_router.delete("/content/items/{item_id}/audio")
async def delete_item_audio(
    item_id: str,
    admin: dict = Depends(require_role(["super_admin", "content_admin"]))
):
    item, item_coll, _vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    audio_meta = item.get("audio_sync") or {}
    fmt = audio_meta.get("format", "mp3")
    target_path = AUDIO_STATIC_DIR / f"{item_id}.{fmt}"
    if target_path.exists():
        try:
            target_path.unlink()
        except Exception:
            pass
    await db[item_coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$unset": {"audio_sync": "", "audio_url": ""}}
    )
    return {"message": "Audio deleted"}


# ===================== ROOT =====================

@api_router.get("/")
async def root():
    return {"message": "Sanatan Saathi API", "version": "2.0"}

# NOTE: `app.include_router(api_router)` is called at the very bottom of this file
# so that ALL @api_router.* definitions (including the aarti per-language media
# block below) are registered. Previously it was called here and new routes
# defined further down were silently dropped.

# Mount static audio files (uploaded MP3s for content items)
_AUDIO_DIR = "/app/backend/static/audio"
os.makedirs(_AUDIO_DIR, exist_ok=True)
app.mount("/api/audio-static", StaticFiles(directory=_AUDIO_DIR), name="audio-static")

# Mount static aarti per-language media (audio/video/thumbnail buckets)
_AARTI_DIR = "/app/backend/static/aarti"
os.makedirs(_AARTI_DIR, exist_ok=True)
app.mount("/api/aarti-static", StaticFiles(directory=_AARTI_DIR), name="aarti-static")


# ===================== AARTI PER-LANGUAGE MEDIA =====================
#
# For Aarti items we store media per-language under
#   /app/backend/static/aarti/{item_id}/{lang}/{audio|video|thumbnail}/{file}
# and mirror the metadata onto content_items.languages.{lang}:
#   .audio_versions[] (1..4 MP3s, each {label, url, format})
#   .video          ({url, format})
#   .thumbnail      ({url, format})
#   .sync           (strict nested sync map)
#
# All endpoints below validate that the item category == 'aarti' to keep scope tight.

AARTI_STATIC_DIR = _Path(_AARTI_DIR)
AARTI_VALID_LANGS = {"hi", "en", "sa", "mr", "gu", "ta", "te", "bn"}
AARTI_AUDIO_EXT = {"mp3", "m4a", "wav", "ogg", "aac"}
AARTI_VIDEO_EXT = {"mp4", "m4v", "webm", "mov"}
AARTI_IMAGE_EXT = {"jpg", "jpeg", "png", "webp"}
AARTI_MAX_AUDIO_BYTES = 25 * 1024 * 1024     # 25 MB
AARTI_MAX_VIDEO_BYTES = 120 * 1024 * 1024    # 120 MB
AARTI_MAX_IMAGE_BYTES = 5 * 1024 * 1024      # 5 MB


async def _get_aarti_item_or_404(item_id: str):
    item, coll, _vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if (item.get("category") or "").lower() != "aarti":
        raise HTTPException(status_code=400, detail="This endpoint is aarti-only")
    return item, coll


def _validate_lang(lang: str):
    if lang not in AARTI_VALID_LANGS:
        raise HTTPException(status_code=400, detail=f"Unsupported language '{lang}'")


async def _stream_file_to_disk(upload: UploadFile, target_path: _Path, max_bytes: int):
    """Save an UploadFile with a cap on total bytes. Removes partial file on overflow."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with target_path.open("wb") as f:
        while True:
            chunk = await upload.read(1024 * 64)
            if not chunk:
                break
            written += len(chunk)
            if written > max_bytes:
                f.close()
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"File too large (max {max_bytes // (1024*1024)} MB)")
            f.write(chunk)
    return written


@api_router.post("/content/items/{item_id}/lang/{lang}/audio")
async def aarti_upload_lang_audio(
    item_id: str,
    lang: str,
    audio: UploadFile = File(...),
    label: str = Form("Normal"),
    slot: Optional[int] = Form(None),   # 1..4 — replace existing slot, or append if None
    admin: dict = Depends(require_role(["super_admin", "content_admin"])),
):
    """Upload/replace one of 1..4 audio versions for a specific language of an Aarti."""
    _validate_lang(lang)
    item, coll = await _get_aarti_item_or_404(item_id)
    ext = (audio.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in AARTI_AUDIO_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: .{ext}")

    languages = dict(item.get("languages") or {})
    lang_bucket = dict(languages.get(lang) or {})
    versions = list(lang_bucket.get("audio_versions") or [])

    if slot is None:
        if len(versions) >= 4:
            raise HTTPException(status_code=400, detail="Max 4 audio versions per language. Replace an existing slot.")
        target_slot = len(versions) + 1
    else:
        target_slot = int(slot)
        if target_slot < 1 or target_slot > 4:
            raise HTTPException(status_code=400, detail="slot must be 1..4")

    target_path = AARTI_STATIC_DIR / item_id / lang / "audio" / f"v{target_slot}.{ext}"
    await _stream_file_to_disk(audio, target_path, AARTI_MAX_AUDIO_BYTES)
    url = f"/api/aarti-static/{item_id}/{lang}/audio/v{target_slot}.{ext}"

    new_entry = {"slot": target_slot, "label": label or f"Version {target_slot}", "url": url, "format": ext}
    versions = [v for v in versions if int(v.get("slot", 0)) != target_slot]
    versions.append(new_entry)
    versions.sort(key=lambda v: int(v.get("slot", 0)))

    lang_bucket["audio_versions"] = versions
    languages[lang] = lang_bucket

    now = datetime.now(timezone.utc).isoformat()
    await db[coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"languages": languages, "updated_at": now}},
    )
    return {"message": "Audio uploaded", "lang": lang, "audio_versions": versions}


@api_router.delete("/content/items/{item_id}/lang/{lang}/audio/{slot}")
async def aarti_delete_lang_audio(
    item_id: str, lang: str, slot: int,
    admin: dict = Depends(require_role(["super_admin", "content_admin"])),
):
    _validate_lang(lang)
    item, coll = await _get_aarti_item_or_404(item_id)
    languages = dict(item.get("languages") or {})
    lang_bucket = dict(languages.get(lang) or {})
    versions = list(lang_bucket.get("audio_versions") or [])
    to_remove = [v for v in versions if int(v.get("slot", 0)) == int(slot)]
    for v in to_remove:
        fmt = v.get("format", "mp3")
        p = AARTI_STATIC_DIR / item_id / lang / "audio" / f"v{slot}.{fmt}"
        if p.exists():
            try: p.unlink()
            except Exception: pass
    versions = [v for v in versions if int(v.get("slot", 0)) != int(slot)]
    lang_bucket["audio_versions"] = versions
    languages[lang] = lang_bucket
    await db[coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"languages": languages, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": f"Audio slot {slot} removed", "audio_versions": versions}


@api_router.post("/content/items/{item_id}/lang/{lang}/video")
async def aarti_upload_lang_video(
    item_id: str, lang: str,
    video: UploadFile = File(...),
    admin: dict = Depends(require_role(["super_admin", "content_admin"])),
):
    _validate_lang(lang)
    item, coll = await _get_aarti_item_or_404(item_id)
    ext = (video.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in AARTI_VIDEO_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: .{ext}")

    # Remove old video files with different extensions
    base_dir = AARTI_STATIC_DIR / item_id / lang / "video"
    if base_dir.exists():
        for old in base_dir.glob("main.*"):
            try: old.unlink()
            except Exception: pass

    target_path = base_dir / f"main.{ext}"
    await _stream_file_to_disk(video, target_path, AARTI_MAX_VIDEO_BYTES)
    url = f"/api/aarti-static/{item_id}/{lang}/video/main.{ext}"

    languages = dict(item.get("languages") or {})
    lang_bucket = dict(languages.get(lang) or {})
    lang_bucket["video"] = {"url": url, "format": ext}
    languages[lang] = lang_bucket
    await db[coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"languages": languages, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Video uploaded", "lang": lang, "video": lang_bucket["video"]}


@api_router.delete("/content/items/{item_id}/lang/{lang}/video")
async def aarti_delete_lang_video(
    item_id: str, lang: str,
    admin: dict = Depends(require_role(["super_admin", "content_admin"])),
):
    _validate_lang(lang)
    item, coll = await _get_aarti_item_or_404(item_id)
    base_dir = AARTI_STATIC_DIR / item_id / lang / "video"
    if base_dir.exists():
        for old in base_dir.glob("main.*"):
            try: old.unlink()
            except Exception: pass
    languages = dict(item.get("languages") or {})
    if lang in languages and isinstance(languages[lang], dict):
        languages[lang] = {k: v for k, v in languages[lang].items() if k != "video"}
    await db[coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"languages": languages, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Video removed"}


@api_router.post("/content/items/{item_id}/lang/{lang}/thumbnail")
async def aarti_upload_lang_thumbnail(
    item_id: str, lang: str,
    thumbnail: UploadFile = File(...),
    admin: dict = Depends(require_role(["super_admin", "content_admin"])),
):
    """Upload a per-language thumbnail image. File upload only (no external URLs)."""
    _validate_lang(lang)
    item, coll = await _get_aarti_item_or_404(item_id)
    ext = (thumbnail.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in AARTI_IMAGE_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported image format: .{ext}")

    base_dir = AARTI_STATIC_DIR / item_id / lang / "thumbnail"
    if base_dir.exists():
        for old in base_dir.glob("main.*"):
            try: old.unlink()
            except Exception: pass
    target_path = base_dir / f"main.{ext}"
    await _stream_file_to_disk(thumbnail, target_path, AARTI_MAX_IMAGE_BYTES)
    url = f"/api/aarti-static/{item_id}/{lang}/thumbnail/main.{ext}"

    languages = dict(item.get("languages") or {})
    lang_bucket = dict(languages.get(lang) or {})
    lang_bucket["thumbnail"] = {"url": url, "format": ext}
    languages[lang] = lang_bucket
    await db[coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"languages": languages, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Thumbnail uploaded", "lang": lang, "thumbnail": lang_bucket["thumbnail"]}


@api_router.post("/content/items/{item_id}/lang/{lang}/sync")
async def aarti_upload_lang_sync(
    item_id: str, lang: str, request: Request,
    admin: dict = Depends(require_role(["super_admin", "content_admin"])),
):
    """Upload sync JSON for a specific language of an Aarti. Accepts the strict nested
    {verses:[{verse_id,start_ms,end_ms,lines:[...]}]} format or a legacy flat list."""
    _validate_lang(lang)
    item, coll = await _get_aarti_item_or_404(item_id)
    body = await request.json()
    try:
        if isinstance(body, dict) and isinstance(body.get("verses"), list) \
                and body["verses"] and isinstance(body["verses"][0], dict) \
                and "lines" in body["verses"][0]:
            from audio_sync_service import parse_nested_json_sync
            sync_map = parse_nested_json_sync(body)
            duration_ms = body.get("duration_ms")
        else:
            from audio_sync_service import parse_json_sync
            sync_map = parse_json_sync(body)
            duration_ms = None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sync parse error: {e}")

    # Overlap check (spec §1 validation)
    for i in range(1, len(sync_map)):
        prev = sync_map[i - 1]
        cur = sync_map[i]
        if prev.get("end_ms") and cur.get("start_ms") < prev["end_ms"]:
            raise HTTPException(status_code=400, detail=f"Timestamp overlap at verse {cur.get('verse_num')} (starts before verse {prev.get('verse_num')} ends)")

    languages = dict(item.get("languages") or {})
    lang_bucket = dict(languages.get(lang) or {})
    lang_bucket["sync"] = {
        "sync_map": sync_map,
        "duration_ms": duration_ms,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    languages[lang] = lang_bucket
    await db[coll].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"languages": languages, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"message": "Sync map saved", "lang": lang, "sync_verses": len(sync_map)}


@api_router.get("/content/items/{item_id}/lang/{lang}/media")
async def aarti_get_lang_media(item_id: str, lang: str):
    """Public — mobile fetches the resolved language's media bundle."""
    _validate_lang(lang)
    item, _coll, _vcoll = await _resolve_item_collections(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    languages = item.get("languages") or {}
    bucket = languages.get(lang) or {}
    return {
        "lang": lang,
        "audio_versions": bucket.get("audio_versions") or [],
        "video": bucket.get("video"),
        "thumbnail": bucket.get("thumbnail"),
        "sync": bucket.get("sync"),
        "full_text": bucket.get("full_text") or "",
    }


# ------------------------------------------------------------------
# Finally register ALL api_router routes (must come AFTER every @api_router
# decorator in this file — see note above).
app.include_router(api_router)



@app.on_event("startup")
async def _ensure_indexes():
    """Create background indexes that aren't critical at boot."""
    try:
        # Panchang cache: keep entries for max 24h via expires_at TTL
        await db.panchang_cache.create_index("expires_at_dt", expireAfterSeconds=0)
    except Exception:
        pass

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _start_scheduler():
    try:
        start_notification_scheduler(app, db)
    except Exception as e:
        logger.warning(f"Scheduler startup skipped: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

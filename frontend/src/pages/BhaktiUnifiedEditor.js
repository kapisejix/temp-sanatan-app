import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BhaktiEditorDrawer from './BhaktiEditorDrawer';

// Mapping from content_item.category -> category manager page
const CATEGORY_ROUTES = {
  chalisa: '/admin/chalisa-manager',
  aarti: '/admin/arti-manager',
  namavali: '/admin/namavali-manager',
  sahasranama: '/admin/sahasranama-manager',
  vedic_mantra: '/admin/vedic-mantra-manager',
  stotram: '/admin/stotram-manager',
  suktam: '/admin/suktam-manager',
  ashtakam: '/admin/ashtakam-manager',
  shatkam: '/admin/shatkam-manager',
  kavacham: '/admin/kavacham-manager',
  nam_ramayanam: '/admin/nam-ramayanam-manager',
};

/**
 * Fallback host route that renders the drawer on its own. Used when an admin
 * lands directly on /admin/bhakti/editor/:id (e.g. after the Import Wizard).
 * Whenever possible we resolve the item's category and redirect the admin to
 * the proper category page with ?edit=<id> so the drawer opens inline there —
 * matching the requested UX ("edit happens only under each category page").
 */
export default function BhaktiUnifiedEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [category, setCategory] = useState(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/content/items/${id}`);
        const cat = data?.category;
        const route = CATEGORY_ROUTES[cat];
        if (route) {
          navigate(`${route}?edit=${id}`, { replace: true });
          return;
        }
        setCategory(cat || '');
      } catch {
        setCategory('');
      } finally {
        setResolved(true);
      }
    })();
  }, [id, api, navigate]);

  if (!resolved) return null;

  return (
    <BhaktiEditorDrawer
      api={api}
      itemId={id}
      category={category || ''}
      open={true}
      onClose={() => navigate('/admin/dashboard')}
    />
  );
}

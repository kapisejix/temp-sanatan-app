import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';

const KATHAS = [
  {
    id: 'satyanarayan',
    title_hi: 'सत्यनारायण कथा',
    title_en: 'Satyanarayan Katha',
    description_hi: 'भगवान विष्णु की महिमा का वर्णन — पूर्णिमा/संक्रांति पर पाठ शुभ।',
    duration: '45 मिनट',
    chapters: 5,
    full_text: `॥ श्री सत्यनारायण कथा ॥\n\nएक समय की बात है, नैमिषारण्य क्षेत्र में अठ्ठासी हजार ऋषि-मुनि एकत्र हुए। वहाँ शौनक आदि ऋषियों ने सूत जी से प्रश्न किया — "हे सूत जी! इस कलियुग में मनुष्य को सुख-समृद्धि कैसे प्राप्त हो?"\n\nसूत जी बोले — "हे ऋषियों! भगवान सत्यनारायण की कथा सुनने और व्रत रखने से सब मनोकामनाएँ पूर्ण होती हैं। यह कथा नारद जी ने भगवान विष्णु से सुनी थी।"\n\n॥ प्रथम अध्याय ॥\nएक समय नारद जी पृथ्वी पर भ्रमण करते हुए मनुष्यों के दुखों को देखकर बहुत दुखी हुए। वे क्षीरसागर में भगवान विष्णु के पास गए और बोले — "हे प्रभु! कोई ऐसा सरल उपाय बताइए जिससे मनुष्य अपने दुखों से मुक्त हो सकें।"\n\nभगवान विष्णु बोले — "हे नारद! भगवान सत्यनारायण का व्रत सब कष्टों का नाश करने वाला है। इसे श्रद्धा से करना चाहिए।"\n\n॥ द्वितीय अध्याय ॥\nकाशी नगर में एक निर्धन ब्राह्मण रहता था। एक दिन भगवान सत्यनारायण उसके पास साधु वेश में आए और बोले — "हे ब्राह्मण! तुम मेरा व्रत करो, तुम्हारी दरिद्रता दूर हो जाएगी।" ब्राह्मण ने व्रत किया और थोड़े ही समय में धनी हो गया।\n\n॥ तृतीय अध्याय ॥\nएक लकड़हारा प्रतिदिन लकड़ी बेचकर जीविका चलाता था। उसने भी सत्यनारायण व्रत किया और सम्पन्न हो गया।\n\n॥ चतुर्थ अध्याय ॥\nएक राजा उल्कामुख ने व्रत किया और उसके राज्य में सुख-शांति फैल गई।\n\n॥ पंचम अध्याय ॥\nजो भी मनुष्य श्रद्धापूर्वक सत्यनारायण कथा सुनता है, उसके सब पाप नष्ट होते हैं और उसे मोक्ष की प्राप्ति होती है।\n\n॥ इति श्री सत्यनारायण कथा सम्पूर्णम् ॥`,
  },
  {
    id: 'bhagwat',
    title_hi: 'श्रीमद् भागवत कथा',
    title_en: 'Shrimad Bhagwat Katha',
    description_hi: 'भगवान कृष्ण की लीलाओं का वर्णन — सात दिवसीय पाठ अत्यंत पुण्यदायी।',
    duration: '7 दिन',
    chapters: 12,
    full_text: `॥ श्रीमद् भागवत महापुराण ॥\n\nश्रीमद् भागवत महापुराण को 18 पुराणों में सर्वश्रेष्ठ माना गया है। इसमें कुल 12 स्कंध, 335 अध्याय और 18,000 श्लोक हैं।\n\n॥ प्रथम स्कंध ॥\nनैमिषारण्य में सूत जी ने शौनक आदि ऋषियों को यह कथा सुनाई। पाण्डवों के स्वर्गारोहण के बाद परीक्षित राजा बने। शृंगी ऋषि के श्राप से उन्हें ज्ञात हुआ कि सात दिन में सर्पदंश से मृत्यु होगी। तब उन्होंने शुकदेव जी से भागवत कथा सुनी।\n\n॥ द्वितीय स्कंध ॥\nसृष्टि की रचना और भगवान के विराट स्वरूप का वर्णन।\n\n॥ तृतीय स्कंध ॥\nविदुर-मैत्रेय संवाद, कपिल मुनि का सांख्य ज्ञान।\n\n॥ चतुर्थ स्कंध ॥\nध्रुव और प्रह्लाद की कथाएँ।\n\n॥ पंचम स्कंध ॥\nभरत राजा की कथा, भू-गोल वर्णन।\n\n॥ षष्ठ स्कंध ॥\nअजामिल उद्धार की कथा।\n\n॥ सप्तम स्कंध ॥\nनरसिंह अवतार और प्रह्लाद चरित्र।\n\n॥ अष्टम स्कंध ॥\nवामन अवतार, समुद्र मंथन।\n\n॥ नवम स्कंध ॥\nराम अवतार, चन्द्रवंश।\n\n॥ दशम स्कंध ॥\nश्रीकृष्ण की संपूर्ण लीला — जन्म से लेकर द्वारका लीला तक।\n\n॥ एकादश स्कंध ॥\nकृष्ण-उद्धव संवाद, यदुवंश का अंत।\n\n॥ द्वादश स्कंध ॥\nकलियुग का वर्णन, परीक्षित मोक्ष, भागवत महिमा।\n\n॥ इति श्रीमद् भागवत महापुराण कथा संक्षेप ॥`,
  },
];

export default function KathasScreen({ navigation }) {
  return (
    <SafeScreen>
      <ScreenHeader title="कथाएँ" subtitle="सत्यनारायण · भागवत" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>श्रद्धा से सुनी गई कथा सब पाप नष्ट करती है।</Text>
        {KATHAS.map(k => (
          <TouchableOpacity
            key={k.id}
            style={styles.card}
            onPress={() => navigation.navigate('KathaDetail', { katha: k })}
            testID={`katha-${k.id}`}
          >
            <Text style={styles.cardEmoji}>📜</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{k.title_hi}</Text>
              <Text style={styles.cardEn}>{k.title_en}</Text>
              <Text style={styles.cardDesc}>{k.description_hi}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>⏱ {k.duration}</Text>
                <Text style={styles.metaPill}>📖 {k.chapters} अध्याय</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14, fontStyle: 'italic' },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  cardEmoji: { fontSize: 36 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardEn: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  cardDesc: { fontSize: 12, color: COLORS.text, marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metaPill: { fontSize: 10, backgroundColor: '#FEF0EC', color: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '700', overflow: 'hidden' },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useState } from "react";

const FAQS = [
  {
    question: "How do I get sponsor approval?",
    answer:
      "When you register, your sponsor will receive your request under their My Network screen. They need to approve you there before your full account is activated.",
  },
  {
    question: "How do I create a post?",
    answer:
      'Tap the "+" button on the Discussions screen to share an update, photo, or video with your network.',
  },
  {
    question: "How do I RSVP to an event?",
    answer:
      "Open an event from the Global Events screen and tap RSVP. If the event requires payment, you'll be asked for payment details before your spot is confirmed.",
  },
  {
    question: "How do I edit my profile?",
    answer: "Tap your name and photo at the top of the menu to open your profile and make edits.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Go to your Profile screen and choose Request Account Deletion. Our team will process the request shortly after.",
  },
];

export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Frequently Asked Questions</Text>

      {FAQS.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <View key={faq.question} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setOpenIndex(isOpen ? null : i)}
            >
              <Text style={styles.question}>{faq.question}</Text>
              <Text style={styles.chevron}>{isOpen ? "−" : "+"}</Text>
            </TouchableOpacity>
            {isOpen && <Text style={styles.answer}>{faq.answer}</Text>}
          </View>
        );
      })}

      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>Still need help?</Text>
        <Text style={styles.contactText}>Our support team is happy to assist.</Text>
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => Linking.openURL("mailto:support@vouch.app")}
        >
          <Text style={styles.contactBtnText}>Email Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 18, fontWeight: "700", color: "#1C1B18", marginBottom: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  question: { fontSize: 15, fontWeight: "700", color: "#1C1B18", flex: 1, marginRight: 10 },
  chevron: { fontSize: 20, fontWeight: "700", color: "#F2650C" },
  answer: { fontSize: 14, color: "#555", lineHeight: 21, marginTop: 10 },
  contactCard: {
    backgroundColor: "#1C1B18",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    alignItems: "center",
  },
  contactTitle: { color: "#F2650C", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  contactText: { color: "#F5EFE0", fontSize: 13, marginBottom: 16, textAlign: "center" },
  contactBtn: {
    backgroundColor: "#F2650C",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  contactBtnText: { color: "#1C1B18", fontWeight: "700", fontSize: 14 },
});

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { Id } from "../../../../convex/_generated/dataModel";

export default function DivisionsScreen() {
  const router = useRouter();
  const divisions = useQuery(api.library.listDivisions, {});
  const categories = useQuery(api.library.listCategories, {});
  const [expanded, setExpanded] = useState<Id<"divisions"> | null>(null);

  if (divisions === undefined || categories === undefined) {
    return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />;
  }

  const sortedDivisions = [...divisions].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={sortedDivisions}
      keyExtractor={(d) => d._id}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No divisions yet.</Text>
        </View>
      }
      renderItem={({ item: division }) => {
        const divisionCategories = categories
          .filter((c) => c.divisionId === division._id)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        const isOpen = expanded === division._id;

        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpanded(isOpen ? null : division._id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{division.name}</Text>
                {division.description ? (
                  <Text style={styles.desc}>{division.description}</Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>{isOpen ? "−" : "+"}</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.categoryList}>
                {divisionCategories.length === 0 ? (
                  <Text style={styles.noCategoriesText}>No categories yet.</Text>
                ) : (
                  divisionCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      style={styles.categoryRow}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/library",
                          params: { categoryId: cat._id },
                        })
                      }
                    >
                      <Text style={styles.categoryName}>{cat.name}</Text>
                      <Text style={styles.categoryArrow}>›</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
  list: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 4 },
  desc: { fontSize: 13, color: "#666" },
  chevron: { fontSize: 20, fontWeight: "700", color: "#C9A227", marginLeft: 10 },
  categoryList: { borderTopWidth: 1, borderTopColor: "#F5EFE0" },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f8",
  },
  categoryName: { fontSize: 14, color: "#1C1B18" },
  categoryArrow: { fontSize: 16, color: "#C9A227" },
  noCategoriesText: { padding: 16, color: "#888", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 16, color: "#888" },
});

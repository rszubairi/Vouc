import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { Id } from "../../../../../convex/_generated/dataModel";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

export default function DivisionsScreen() {
  const router = useRouter();
  const divisions = useQuery(api.library.listDivisions, {});
  const categories = useQuery(api.library.listCategories, {});
  const [expanded, setExpanded] = useState<Id<"divisions"> | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

  const sortedDivisions = useMemo(() => {
    if (!divisions) return [];
    return [...divisions].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [divisions]);

  const filteredDivisions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedDivisions;
    return sortedDivisions.filter((d) => {
      if (d.name.toLowerCase().includes(q)) return true;
      return (categories ?? []).some(
        (c) => c.divisionId === d._id && c.name.toLowerCase().includes(q)
      );
    });
  }, [sortedDivisions, categories, search]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  if (divisions === undefined || categories === undefined) {
    return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />;
  }

  return (
    <View style={styles.container}>
      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.search}
            placeholder="Search divisions or categories"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      )}
      <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={styles.list}
      data={filteredDivisions}
      keyExtractor={(d) => d._id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1B18" />
      }
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
                          pathname: "/(app)/directory/[categoryId]",
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  list: { padding: 12, paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#FAF5EA",
    gap: 8,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
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
  chevron: { fontSize: 20, fontWeight: "700", color: "#F2650C", marginLeft: 10 },
  categoryList: { borderTopWidth: 1, borderTopColor: "#F5EFE0" },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FAF5EA",
  },
  categoryName: { fontSize: 14, color: "#1C1B18" },
  categoryArrow: { fontSize: 16, color: "#F2650C" },
  noCategoriesText: { padding: 16, color: "#888", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 16, color: "#888" },
});

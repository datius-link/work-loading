import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: "#f7f7f7",
    flex: 1,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },

  textWrap: {
    marginLeft: 15,
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  cardDesc: {
    color: "#555",
    marginTop: 2,
    fontSize: 13,
  },
});

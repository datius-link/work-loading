import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    color: "#222",
  },

  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 15,
  },

  phoneRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    paddingLeft: 14,
    marginBottom: 15,
  },

  prefix: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 10,
  },

  phoneInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
  },

  btn: {
    backgroundColor: "#4ECDC4",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

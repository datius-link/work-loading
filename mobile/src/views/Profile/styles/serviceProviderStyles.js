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
    textAlign: "center",
  },

  input: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    elevation: 1,
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  prefix: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    elevation: 1,
  },

  inputRowPhone: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    elevation: 1,
  },

  phoneInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
  },

  icon: {
    marginRight: 8,
  },

  btn: {
    backgroundColor: "#4ECDC4",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  signInText: {
    marginTop: 20,
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },

  signInLink: {
    color: "#007bff",
    fontWeight: "bold",
  },

  errorBox: {
    backgroundColor: "rgba(230,57,70,0.12)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#E63946",
  },

  errorText: {
    color: "#E63946",
    fontSize: 13,
    fontWeight: "500",
  },

  successBox: {
    backgroundColor: "rgba(42,157,143,0.12)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#2A9D8F",
  },

  successText: {
    color: "#2A9D8F",
    fontSize: 13,
    fontWeight: "600",
  },
});

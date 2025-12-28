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
  segmented: {
  flexDirection: "row",
  backgroundColor: "#EAF6F4",
  borderRadius: 16,
  padding: 4,
  marginVertical: 24,
},

segmentBtn: {
  flex: 1,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 12,
  borderRadius: 12,
},

segmentActive: {
  backgroundColor: "#0B6B63",
},

segmentText: {
  marginLeft: 8,
  fontWeight: "600",
  color: "#0B6B63",
},

segmentTextActive: {
  color: "#fff",
},

card: {
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 18,
  marginBottom: 24,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
},

cardInfo: {
  textAlign: "center",
  color: "#666",
  fontSize: 13,
  marginBottom: 14,
},

phoneRow: {
  flexDirection: "row",
  alignItems: "center",
},

prefixBox: {
  backgroundColor: "#F1F5F4",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 12,
  marginRight: 10,
},

prefixText: {
  fontWeight: "600",
  color: "#333",
},

phoneInputRow: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F9FAFA",
  borderRadius: 12,
  paddingHorizontal: 12,
},

phoneInput: {
  flex: 1,
  paddingLeft: 10,
  fontSize: 15,
},

error: {
  color: "#E53935",
  fontSize: 13,
  marginTop: 10,
  textAlign: "center",
},

backText: {
  textAlign: "center",
  color: "#0B6B63",
  marginTop: 16,
  fontWeight: "600",
},

});

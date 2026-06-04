import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../../api/api";
import { useAppTheme } from "../../theme";
import AppIcon from "../../icons/AppIcon";
import { SOCIAL_ICONS } from "../../icons/socialIcons";
import PostGridItem from "../../views/postCard/PostGridItem";

const { width } = Dimensions.get("window");
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * 2) / 3;

function avatarUrl(name, pic) {
  if (pic) return pic;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User"
  )}&background=0B6B63&color=fff`;
}

function socialUrl(platform, handle) {
  const h = String(handle || "").replace(/^@/, "");
  const p = String(platform || "").toLowerCase();
  if (p === "instagram") return `https://instagram.com/${h}`;
  if (p === "facebook") return `https://facebook.com/${h}`;
  if (p === "twitter" || p === "x") return `https://twitter.com/${h}`;
  if (p === "whatsapp") return `https://wa.me/${h.replace(/\D/g, "")}`;
  if (p === "tiktok") return `https://tiktok.com/@${h}`;
  if (p === "linkedin") return `https://linkedin.com/in/${h}`;
  if (p === "youtube") return `https://youtube.com/@${h}`;
  return h.startsWith("http") ? h : `https://${h}`;
}

function normalizeProfile(provider) {
  return {
    ...provider,
    profilePic: provider?.profilePic || provider?.profile_pic || "",
    contacts: Array.isArray(provider?.contacts) ? provider.contacts : [],
    services: Array.isArray(provider?.services) ? provider.services.filter(Boolean) : [],
    socials: Array.isArray(provider?.socials) ? provider.socials : [],
    followers: Number(provider?.followers || provider?.followers_count || 0),
    following: Number(provider?.following || provider?.following_count || 0),
    posts_count: Number(provider?.posts_count || 0),
  };
}

export default function MyProfile({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("moment");
  const [numberPicker, setNumberPicker] = useState({ visible: false, mode: "call", numbers: [] });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [profileRes, postsRes] = await Promise.all([
        api.get("/service-provider/me"),
        api.get("/posts/me"),
      ]);
      const nextProvider = normalizeProfile(profileRes?.data?.provider || {});
      setProvider(nextProvider);
      setPosts(postsRes?.data?.posts || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile.");
      setProvider(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const filteredPosts = useMemo(
    () => posts.filter((post) => (activeTab === "moment" ? post?.type === "moment" : post?.type !== "moment")),
    [posts, activeTab]
  );

  const contacts = useMemo(
    () => (provider?.contacts || []).filter((contact) => contact?.number),
    [provider]
  );
  const callNumbers = contacts.filter((contact) => contact.call);
  const smsNumbers = contacts.filter((contact) => contact.sms);
  const socials = (provider?.socials || []).filter((social) => social?.handle && SOCIAL_ICONS[social.platform]);

  const openNumber = (mode, item) => {
    const url = mode === "sms" ? `sms:+255${item.number}` : `tel:+255${item.number}`;
    Linking.openURL(url);
  };

  const handleContactAction = (mode, numbers) => {
    if (!numbers.length) return;
    if (numbers.length === 1) {
      openNumber(mode, numbers[0]);
      return;
    }
    setNumberPicker({ visible: true, mode, numbers });
  };

  const handleShare = async () => {
    const username = provider?.username ? `@${provider.username}` : provider?.full_name;
    await Share.share({
      message: `Check out ${username} on e-kazi.`,
    });
  };

  const openPost = (item) => {
    navigation.navigate("PostFeedView", { posts: filteredPosts, initialPostId: item.id });
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !provider) {
    return (
      <SafeAreaView edges={["top"]} style={styles.center}>
        <AppIcon name="warning" size={44} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Profile unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={loadProfile}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const Header = (
    <View>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Profile</Text>
          <Text style={styles.screenSub}>Your public service profile</Text>
        </View>
        <View style={styles.iconActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <AppIcon name="share" size={19} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate("ProviderSettings", { from: "MyProfile" })}
          >
            <AppIcon name="settings" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hero}>
        <Image
          source={{ uri: avatarUrl(provider.full_name || provider.username, provider.profilePic) }}
          style={styles.avatar}
        />
        <View style={styles.identity}>
          <Text style={styles.name}>{provider.full_name || "No name"}</Text>
          {!!provider.username && <Text style={styles.username}>@{provider.username}</Text>}
          {!!provider.field && <Text style={styles.field}>{provider.field}</Text>}
          {!!provider.location && (
            <View style={styles.inlineMeta}>
              <AppIcon name="mapPin" size={13} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{provider.location}</Text>
            </View>
          )}
        </View>
      </View>

      {!!provider.bio && <Text style={styles.bio}>{provider.bio}</Text>}

      <View style={styles.statsRow}>
        <Stat label="Posts" value={provider.posts_count || posts.length} styles={styles} />
        <Stat
          label="Followers"
          value={provider.followers}
          styles={styles}
          onPress={() => navigation.navigate("ConnectionsScreen", { providerUuid: "me" })}
        />
        <Stat
          label="Following"
          value={provider.following}
          styles={styles}
          onPress={() => navigation.navigate("ConnectionsScreen", { providerUuid: "me" })}
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("EditProvider")}>
          <AppIcon name="edit" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("EngagementSummary")}
        >
          <AppIcon name="chart" size={16} color={theme.colors.primary} />
          <Text style={styles.secondaryBtnText}>Insights</Text>
        </TouchableOpacity>
      </View>

      {(callNumbers.length > 0 || smsNumbers.length > 0 || socials.length > 0) && (
        <View style={styles.toolRow}>
          {callNumbers.length > 0 && (
            <TouchableOpacity
              style={styles.roundTool}
              onPress={() => handleContactAction("call", callNumbers)}
            >
              <AppIcon name="phone" size={19} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {smsNumbers.length > 0 && (
            <TouchableOpacity
              style={styles.roundTool}
              onPress={() => handleContactAction("sms", smsNumbers)}
            >
              <AppIcon name="mail" size={19} color={theme.colors.accent} />
            </TouchableOpacity>
          )}
          {socials.map((social, index) => {
            const Icon = SOCIAL_ICONS[social.platform];
            return (
              <TouchableOpacity
                key={`${social.platform}-${index}`}
                style={styles.roundTool}
                onPress={() => Linking.openURL(socialUrl(social.platform, social.handle))}
              >
                <Icon width={21} height={21} stroke={theme.colors.primary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ProfileSection title="Services" styles={styles}>
        {provider.services.length ? (
          <View style={styles.chipWrap}>
            {provider.services.map((service, index) => (
              <View key={`${service}-${index}`} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{service}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptySmall}>No services added yet.</Text>
        )}
      </ProfileSection>

      <View style={styles.tabs}>
        <TabButton
          label="Moments"
          active={activeTab === "moment"}
          onPress={() => setActiveTab("moment")}
          styles={styles}
        />
        <TabButton
          label="Clips"
          active={activeTab === "clip"}
          onPress={() => setActiveTab("clip")}
          styles={styles}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <FlatList
        data={filteredPosts}
        renderItem={({ item }) => (
          <PostGridItem post={item} size={ITEM_SIZE} onPress={() => openPost(item)} />
        )}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={Header}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No {activeTab === "moment" ? "moments" : "clips"} yet</Text>
          </View>
        }
      />

      <NumberPicker
        picker={numberPicker}
        onClose={() => setNumberPicker((prev) => ({ ...prev, visible: false }))}
        onSelect={openNumber}
        styles={styles}
        theme={theme}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, styles, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.stat} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

function ProfileSection({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TabButton({ label, active, onPress, styles }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active && <View style={styles.tabLine} />}
    </TouchableOpacity>
  );
}

function NumberPicker({ picker, onClose, onSelect, styles, theme }) {
  return (
    <Modal visible={picker.visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {picker.mode === "sms" ? "Send SMS to" : "Call"}
          </Text>
          {picker.numbers.map((item, index) => (
            <TouchableOpacity
              key={`${item.number}-${index}`}
              style={styles.modalOption}
              onPress={() => {
                onClose();
                onSelect(picker.mode, item);
              }}
            >
              <AppIcon
                name={picker.mode === "sms" ? "mail" : "phone"}
                size={18}
                color={theme.colors.primary}
              />
              <Text style={styles.modalOptionText}>+255 {item.number}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  errorTitle: {
    marginTop: 12,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  errorText: {
    color: theme.colors.textMuted,
    textAlign: "center",
    marginVertical: 12,
  },
  content: {
    backgroundColor: theme.colors.bg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  screenSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  iconActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 3,
    borderColor: theme.colors.primarySoft,
  },
  identity: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  username: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },
  field: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  inlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  bio: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textSecondary,
    paddingHorizontal: 18,
    paddingTop: 12,
    lineHeight: 20,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 14,
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  roundTool: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  serviceChipText: {
    color: theme.colors.accent,
    fontWeight: "900",
    fontSize: 12,
  },
  emptySmall: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  tabs: {
    marginTop: 10,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    color: theme.colors.textMuted,
    fontWeight: "900",
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tabLine: {
    position: "absolute",
    bottom: 0,
    width: 56,
    height: 3,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  emptyState: {
    paddingVertical: 44,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});

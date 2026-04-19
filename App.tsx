import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Welcome />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Welcome() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🎾</Text>
        </View>
        <Text style={styles.appName}>Tornfy</Text>
        <Text style={styles.tagline}>Tennis Tournament Manager</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome</Text>
        <Text style={styles.cardSubtitle}>
          Sign in to register for tournaments, view brackets, and track your matches.
        </Text>

        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
        >
          <Text style={styles.btnPrimaryText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Create a new account"
        >
          <Text style={styles.btnSecondaryText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.adminHint}>
          Are you an admin?{' '}
          <Text style={styles.adminLink}>Sign in with admin credentials.</Text>
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>FGCU · HCI Project · 2026</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4c81',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  // ── Hero ──────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: '#ffffffaa',
    letterSpacing: 0.5,
  },

  // ── Card ──────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    gap: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f4c81',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  btnPrimary: {
    width: '100%',
    height: 52,
    backgroundColor: '#0f4c81',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnSecondary: {
    width: '100%',
    height: 52,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#0f4c81',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  adminHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  adminLink: {
    color: '#0f4c81',
    fontWeight: '600',
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    fontSize: 12,
    color: '#ffffff55',
    letterSpacing: 1,
  },
});

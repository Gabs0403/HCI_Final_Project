import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { AuthStackParamList } from '@/navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp, pendingConfirmation } = useAuth();
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Supabase sends a confirmation email — show a holding screen until verified
  if (pendingConfirmation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmEmoji}>📬</Text>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmText}>
            We sent a confirmation link to{' '}
            <Text style={styles.confirmEmail}>{email}</Text>.
            {'\n'}Open it to activate your account.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Text style={styles.backBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.logo}>🎾</Text>
            <Text style={styles.appName}>HCI Project</Text>
            <Text style={styles.tagline}>Create your account</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jane Smith"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Full name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                accessibilityLabel="Email address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                returnKeyType="next"
                accessibilityLabel="Password"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                accessibilityLabel="Confirm password"
              />
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnPrimaryText}>Create Account</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Go to sign in"
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkHighlight}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f4c81' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },

  hero: { alignItems: 'center', gap: 6 },
  logo: { fontSize: 52 },
  appName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 15, color: '#ffffffaa' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },

  btnPrimary: {
    height: 52,
    backgroundColor: '#0f4c81',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkBtn: { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 14, color: '#64748b' },
  linkHighlight: { color: '#0f4c81', fontWeight: '700' },

  // Email confirmation screen
  confirmBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14,
  },
  confirmEmoji: { fontSize: 56 },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  confirmText: { fontSize: 15, color: '#ffffffcc', textAlign: 'center', lineHeight: 22 },
  confirmEmail: { fontWeight: '700', color: '#fff' },
  backBtn: {
    marginTop: 8, height: 52, paddingHorizontal: 32,
    backgroundColor: '#ffffff22', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

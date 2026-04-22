import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '@/navigation/AdminNavigator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SurfaceType } from '@/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'CreateTournament'>;

const SURFACES: SurfaceType[] = ['hard', 'clay', 'grass', 'indoor'];
const MAX_PLAYER_OPTIONS = [4, 8, 16];

interface FormState {
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  max_players: number;
  entry_fee: string;
  surface: SurfaceType;
  rules: string;
}

const DEFAULT_RULES =
  'Single elimination format. Best of 3 sets. No-Ad scoring in the third set. ' +
  'Players must check in 15 minutes before their scheduled match time. ' +
  'Failure to appear results in a walkover for the opponent.';

export function CreateTournamentScreen({ navigation }: Props) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    location: 'FGCU Tennis Complex, Fort Myers FL',
    start_date: fmt(today),
    end_date: fmt(nextWeek),
    max_players: 8,
    entry_fee: '25',
    surface: 'hard',
    rules: DEFAULT_RULES,
  });

  const set = (key: keyof FormState) => (val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = (): string | null => {
    if (!form.name.trim())        return 'Tournament name is required.';
    if (!form.location.trim())    return 'Location is required.';
    if (!form.start_date.trim())  return 'Start date is required (YYYY-MM-DD).';
    if (!form.end_date.trim())    return 'End date is required (YYYY-MM-DD).';
    if (form.start_date > form.end_date) return 'End date must be after start date.';
    const fee = parseFloat(form.entry_fee);
    if (isNaN(fee) || fee < 0)   return 'Entry fee must be a positive number.';
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) { Alert.alert('Invalid form', err); return; }

    setLoading(true);

    const { error } = await supabase.from('tournament').insert({
      name: form.name.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      start_date: form.start_date.trim(),
      end_date: form.end_date.trim(),
      max_players: form.max_players,
      entry_fee: parseFloat(form.entry_fee),
      rules: form.rules.trim(),
      status: 'registration_open',
      surface: form.surface,
      created_by: userProfile?.id,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Basic info */}
          <SectionHeader title="Basic Info" />

          <Field label="Tournament Name *">
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={set('name')}
              placeholder="e.g. FGCU Spring Open"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="Tournament name"
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.description}
              onChangeText={set('description')}
              placeholder="Short description of the tournament"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              accessibilityLabel="Tournament description"
            />
          </Field>

          <Field label="Location *">
            <TextInput
              style={styles.input}
              value={form.location}
              onChangeText={set('location')}
              placeholder="Venue name and city"
              placeholderTextColor="#94a3b8"
              accessibilityLabel="Tournament location"
            />
          </Field>

          {/* Dates */}
          <SectionHeader title="Dates" />

          <View style={styles.row}>
            <Field label="Start Date *" flex>
              <TextInput
                style={styles.input}
                value={form.start_date}
                onChangeText={set('start_date')}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Start date"
              />
            </Field>
            <Field label="End Date *" flex>
              <TextInput
                style={styles.input}
                value={form.end_date}
                onChangeText={set('end_date')}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="End date"
              />
            </Field>
          </View>

          {/* Format */}
          <SectionHeader title="Format" />

          <Field label="Max Players">
            <View style={styles.chipRow}>
              {MAX_PLAYER_OPTIONS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, form.max_players === n && styles.chipSelected]}
                  onPress={() => set('max_players')(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} players`}
                  accessibilityState={{ selected: form.max_players === n }}
                >
                  <Text style={[styles.chipText, form.max_players === n && styles.chipTextSelected]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Court Surface">
            <View style={styles.chipRow}>
              {SURFACES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, form.surface === s && styles.chipSelected]}
                  onPress={() => set('surface')(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s} surface`}
                  accessibilityState={{ selected: form.surface === s }}
                >
                  <Text style={[styles.chipText, form.surface === s && styles.chipTextSelected]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <Field label="Entry Fee (USD)">
            <TextInput
              style={styles.input}
              value={form.entry_fee}
              onChangeText={set('entry_fee')}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              accessibilityLabel="Entry fee in US dollars"
            />
          </Field>

          {/* Rules */}
          <SectionHeader title="Rules" />

          <Field label="Tournament Rules">
            <TextInput
              style={[styles.input, styles.rulesInput]}
              value={form.rules}
              onChangeText={set('rules')}
              placeholder="Describe the tournament rules..."
              placeholderTextColor="#94a3b8"
              multiline
              accessibilityLabel="Tournament rules"
            />
          </Field>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btnCreate, loading && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create tournament"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnCreateText}>Create Tournament</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, gap: 12 },

  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 8,
  },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },

  input: {
    minHeight: 48, borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#1e293b', backgroundColor: '#ffffff',
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  rulesInput: { height: 140, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  chipSelected: { borderColor: '#0f4c81', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  chipTextSelected: { color: '#0f4c81' },

  btnCreate: {
    height: 52, backgroundColor: '#0f4c81', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnCreateText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

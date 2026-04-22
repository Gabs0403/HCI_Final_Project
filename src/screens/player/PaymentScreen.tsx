import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerStackParamList } from '@/navigation/PlayerNavigator';
import { validateCardNumber, validateCvv, validateExpiry } from '@/lib/validation';
import { useRegistration } from '@/hooks/useRegistration';

type Props = NativeStackScreenProps<PlayerStackParamList, 'Payment'>;

function formatCard(val: string) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
}

export function PaymentScreen({ route, navigation }: Props) {
    const { tournamentId, tournamentName, entryFee } = route.params;
    const { userProfile } = useAuth();
    const { register } = useRegistration();
    const [loading, setLoading] = useState(false);

    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [name, setName] = useState(userProfile?.full_name ?? '');

    const validate = (): string | null => {
        const digits = card.replace(/\s/g, '');
        const cardCheck = validateCardNumber(digits);
        if (!cardCheck.valid) return cardCheck.error ?? 'Invalid card';

        const expiryCheck = validateExpiry(expiry);
        if (!expiryCheck.valid) return expiryCheck.error ?? 'Invalid expiry';

        const cvvCheck = validateCvv(cvv);
        if (!cvvCheck.valid) return cvvCheck.error ?? 'Invalid CVV';

        if (!name.trim()) return 'Enter the cardholder name.';
        return null;
    };

    const handlePay = async () => {
        const err = validate();
        if (err) { Alert.alert('Check your details', err); return; }

        setLoading(true);
        const result = await register(tournamentId);
        setLoading(false);

        switch (result.status) {
            case 'registered':
            case 'already-registered':
                navigation.replace('RegistrationConfirm', { tournamentId, tournamentName });
                return;
            case 'tournament-closed':
                Alert.alert('Registration closed', 'This tournament is no longer accepting registrations.');
                return;
            case 'tournament-full':
                Alert.alert('Tournament full', 'Sorry, this tournament just filled up.');
                return;
            case 'not-signed-in':
                Alert.alert('Sign in required', 'Please sign in before registering.');
                return;
            case 'error':
                Alert.alert('Error', result.message);
                return;
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    {/* Order summary */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Registering for</Text>
                        <Text style={styles.summaryName}>{tournamentName}</Text>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryItemLabel}>Entry Fee</Text>
                            <Text style={styles.summaryAmount}>${entryFee.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryItemLabel}>Processing Fee</Text>
                            <Text style={styles.summaryAmount}>$0.00</Text>
                        </View>
                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                            <Text style={styles.summaryTotalLabel}>Total</Text>
                            <Text style={styles.summaryTotalAmount}>${entryFee.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Demo notice */}
                    <View style={styles.demoNotice}>
                        <Text style={styles.demoNoticeText}>
                            🧪 Demo mode — no real payment is processed.
                        </Text>
                    </View>

                    {/* Card form */}
                    <Text style={styles.sectionTitle}>Payment Details</Text>

                    <View style={styles.formCard}>
                        <Field label="Cardholder Name">
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Full name on card"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="words"
                                accessibilityLabel="Cardholder name"
                            />
                        </Field>

                        <Field label="Card Number">
                            <TextInput
                                style={styles.input}
                                value={card}
                                onChangeText={v => setCard(formatCard(v))}
                                placeholder="1234 5678 9012 3456"
                                placeholderTextColor="#94a3b8"
                                keyboardType="number-pad"
                                maxLength={19}
                                accessibilityLabel="Card number"
                            />
                        </Field>

                        <View style={styles.row}>
                            <Field label="Expiry" flex>
                                <TextInput
                                    style={styles.input}
                                    value={expiry}
                                    onChangeText={v => setExpiry(formatExpiry(v))}
                                    placeholder="MM/YY"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                    accessibilityLabel="Card expiry date"
                                />
                            </Field>
                            <Field label="CVV" flex>
                                <TextInput
                                    style={styles.input}
                                    value={cvv}
                                    onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="•••"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    secureTextEntry
                                    accessibilityLabel="Card CVV security code"
                                />
                            </Field>
                        </View>
                    </View>

                    {/* Pay button */}
                    <TouchableOpacity
                        style={[styles.payBtn, loading && styles.payBtnDisabled]}
                        onPress={handlePay}
                        disabled={loading}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Pay ${entryFee.toFixed(2)} and confirm registration`}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.payBtnText}>Pay ${entryFee.toFixed(2)} & Register</Text>
                        }
                    </TouchableOpacity>

                    <Text style={styles.secureNote}>🔒 Secured · Demo only · No charges applied</Text>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
    return (
        <View style={[styles.field, flex && { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 16, gap: 14 },

    summaryCard: {
        backgroundColor: '#0f4c81', borderRadius: 18, padding: 18, gap: 6,
    },
    summaryLabel: { fontSize: 12, color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryName: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
    summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryItemLabel: { fontSize: 14, color: '#bfdbfe' },
    summaryAmount: { fontSize: 14, color: '#bfdbfe', fontWeight: '600' },
    summaryTotal: { marginTop: 4 },
    summaryTotalLabel: { fontSize: 16, color: '#ffffff', fontWeight: '700' },
    summaryTotalAmount: { fontSize: 18, color: '#ffffff', fontWeight: '800' },

    demoNotice: {
        backgroundColor: '#fef9c3', borderRadius: 10,
        paddingVertical: 8, paddingHorizontal: 12,
    },
    demoNoticeText: { fontSize: 12, color: '#854d0e', fontWeight: '600', textAlign: 'center' },

    sectionTitle: {
        fontSize: 12, fontWeight: '700', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 1,
    },
    formCard: {
        backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    row: { flexDirection: 'row', gap: 12 },
    field: { gap: 5 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    input: {
        height: 48, borderWidth: 1.5, borderColor: '#e2e8f0',
        borderRadius: 12, paddingHorizontal: 14,
        fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc',
    },

    payBtn: {
        height: 54, backgroundColor: '#0f4c81', borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0f4c81', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
        marginTop: 4,
    },
    payBtnDisabled: { opacity: 0.6 },
    payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    secureNote: { textAlign: 'center', fontSize: 12, color: '#64748b', marginBottom: 8 },
});
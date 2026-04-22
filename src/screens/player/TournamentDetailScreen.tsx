import { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTournament } from '@/hooks/useTournaments';
import { PlayerStackParamList } from '@/navigation/PlayerNavigator';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Props = NativeStackScreenProps<PlayerStackParamList, 'TournamentDetail'>;

const SURFACE_EMOJI: Record<string, string> = {
    hard: '🔵', clay: '🟤', grass: '🟢', indoor: '⚪',
};

export function TournamentDetailScreen({ route, navigation }: Props) {
    const { tournamentId } = route.params;
    const { userProfile } = useAuth();
    const { data: tournament, loading } = useTournament(tournamentId);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);
    const [checkingReg, setCheckingReg] = useState(true);
    const [bracketExists, setBracketExists] = useState(false);

    useEffect(() => {
        if (!userProfile?.id) { setCheckingReg(false); return; }
        Promise.all([
            supabase
                .from('registration')
                .select('id')
                .eq('tournament_id', tournamentId)
                .eq('player_id', userProfile.id)
                .maybeSingle(),
            supabase
                .from('match')
                .select('id', { count: 'exact', head: true })
                .eq('tournament_id', tournamentId),
        ]).then(([regResult, matchResult]) => {
            setAlreadyRegistered(!!regResult.data);
            setBracketExists((matchResult.count ?? 0) > 0);
            setCheckingReg(false);
        });
    }, [tournamentId, userProfile?.id]);

    if (loading) return <LoadingSpinner message="Loading tournament..." />;
    if (!tournament) return null;

    const spotsLeft = tournament.max_players - tournament.current_players;
    const isFull = spotsLeft <= 0;
    const canRegister =
        tournament.status === 'registration_open' &&
        !isFull &&
        !alreadyRegistered &&
        !bracketExists;
    const showBracket = tournament.status === 'in_progress' || tournament.status === 'completed';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Hero */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>{tournament.name}</Text>
                    {tournament.description ? (
                        <Text style={styles.heroDesc}>{tournament.description}</Text>
                    ) : null}
                </View>

                {/* Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.infoGrid}>
                        <InfoRow icon="📍" label="Location" value={tournament.location} />
                        <InfoRow
                            icon={SURFACE_EMOJI[tournament.surface] ?? '🎾'}
                            label="Surface"
                            value={tournament.surface.charAt(0).toUpperCase() + tournament.surface.slice(1)}
                        />
                        <InfoRow
                            icon="📅"
                            label="Dates"
                            value={`${new Date(tournament.start_date).toLocaleDateString()} – ${new Date(tournament.end_date).toLocaleDateString()}`}
                        />
                        <InfoRow
                            icon="👥"
                            label="Players"
                            value={`${tournament.current_players} / ${tournament.max_players}${isFull ? ' (Full)' : ` — ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}`}
                        />
                        <InfoRow
                            icon="💰"
                            label="Entry Fee"
                            value={`$${Number(tournament.entry_fee).toFixed(2)}`}
                            last
                        />
                    </View>
                </View>

                {/* Rules */}
                {tournament.rules ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Rules</Text>
                        <View style={styles.rulesCard}>
                            <Text style={styles.rulesText}>{tournament.rules}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Bracket button */}
                {showBracket && (
                    <TouchableOpacity
                        style={styles.bracketBtn}
                        onPress={() => navigation.navigate('Bracket', { tournamentId: tournament.id, tournamentName: tournament.name })}
                        accessibilityRole="button"
                        accessibilityLabel="View tournament bracket"
                    >
                        <Text style={styles.bracketBtnText}>🏆 View Bracket</Text>
                    </TouchableOpacity>
                )}

                {/* Registration CTA */}
                {checkingReg ? (
                    <ActivityIndicator style={{ marginTop: 16 }} color="#0f4c81" />
                ) : alreadyRegistered ? (
                    <View style={styles.registeredBanner}>
                        <Text style={styles.registeredText}>✅ You're registered!</Text>
                        {showBracket && (
                            <TouchableOpacity onPress={() => navigation.navigate('Bracket', { tournamentId: tournament.id, tournamentName: tournament.name })}>
                                <Text style={styles.registeredLink}>View Bracket →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : bracketExists ? (
                    <View style={styles.closedBanner}>
                        <Text style={styles.closedBannerText}>🔒 Registration closed — bracket generated</Text>
                    </View>
                ) : canRegister ? (
                    <TouchableOpacity
                        style={styles.registerBtn}
                        onPress={() => navigation.navigate('Payment', {
                            tournamentId: tournament.id,
                            tournamentName: tournament.name,
                            entryFee: Number(tournament.entry_fee),
                        })}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Register for ${tournament.name}`}
                    >
                        <Text style={styles.registerBtnText}>
                            Register — ${Number(tournament.entry_fee).toFixed(2)}
                        </Text>
                    </TouchableOpacity>
                ) : isFull ? (
                    <View style={styles.fullBanner}>
                        <Text style={styles.fullBannerText}>Tournament is full</Text>
                    </View>
                ) : null}

            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
    return (
        <View style={[styles.infoRow, last && styles.infoRowLast]}>
            <Text style={styles.infoIcon}>{icon}</Text>
            <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 16, gap: 16 },

    heroCard: { backgroundColor: '#0f4c81', borderRadius: 18, padding: 20, gap: 8 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
    heroDesc: { fontSize: 14, color: '#bfdbfe', lineHeight: 20 },

    section: { gap: 8 },
    sectionTitle: {
        fontSize: 12, fontWeight: '700', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 1,
    },
    infoGrid: {
        backgroundColor: '#ffffff', borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    infoRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingVertical: 12, paddingHorizontal: 14, gap: 12,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    infoRowLast: { borderBottomWidth: 0 },
    infoIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    infoText: { flex: 1, gap: 1 },
    infoLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },

    rulesCard: {
        backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    rulesText: { fontSize: 14, color: '#475569', lineHeight: 22 },

    bracketBtn: {
        height: 50, backgroundColor: '#f1f5f9', borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    bracketBtnText: { color: '#0f4c81', fontWeight: '700', fontSize: 15 },

    registerBtn: {
        height: 54, backgroundColor: '#0f4c81', borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0f4c81', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    registerBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

    registeredBanner: {
        backgroundColor: '#dcfce7', borderRadius: 14,
        padding: 16, alignItems: 'center', gap: 6,
    },
    registeredText: { fontSize: 14, fontWeight: '700', color: '#166534' },
    registeredLink: { fontSize: 13, color: '#0f4c81', fontWeight: '600' },

    closedBanner: {
        backgroundColor: '#fef9c3', borderRadius: 14,
        padding: 16, alignItems: 'center',
    },
    closedBannerText: { fontSize: 14, fontWeight: '600', color: '#854d0e' },

    fullBanner: {
        backgroundColor: '#f1f5f9', borderRadius: 14,
        padding: 16, alignItems: 'center',
    },
    fullBannerText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
});

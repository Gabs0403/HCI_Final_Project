import { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerStackParamList } from '@/navigation/PlayerNavigator';
import { useMatches, MatchWithPlayers } from '@/hooks/useMatches';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Props = NativeStackScreenProps<PlayerStackParamList, 'Bracket'>;

function getRoundLabel(round: number, totalRounds: number): string {
    const fromEnd = totalRounds - round;
    if (fromEnd === 0) return '🏆 Final';
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round of ${Math.pow(2, fromEnd + 1)}`;
}

export function BracketScreen({ route }: Props) {
    const { tournamentId, tournamentName } = route.params;
    const { matches, loading } = useMatches(tournamentId);

    if (loading) return <LoadingSpinner message="Loading bracket..." />;

    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
    const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1] : 0;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{tournamentName}</Text>
                    <Text style={styles.headerSub}>Single Elimination Bracket</Text>
                </View>

                {rounds.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>🎾</Text>
                        <Text style={styles.emptyText}>Bracket not available yet.</Text>
                        <Text style={styles.emptySubText}>
                            Matches will appear once the tournament begins.
                        </Text>
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.bracketRow}>
                            {rounds.map(round => (
                                <View key={round} style={styles.roundColumn}>
                                    <Text style={styles.roundLabel}>
                                        {getRoundLabel(round, totalRounds)}
                                    </Text>
                                    <View style={styles.matchesColumn}>
                                        {matches
                                            .filter(m => m.round === round)
                                            .map((match, idx) => (
                                                <MatchCard key={match.id} match={match} index={idx} />
                                            ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

function MatchCard({ match, index }: { match: MatchWithPlayers; index: number }) {
    const isCompleted = match.status === 'completed';
    const p1 = match.player1;
    const p2 = match.player2;

    return (
        <View style={[styles.matchCard, isCompleted && styles.matchCardDone]}>
            <Text style={styles.matchNum}>Match {index + 1}</Text>

            {/* Player 1 */}
            <View style={[
                styles.playerRow,
                isCompleted && match.winner_id === p1?.id && styles.playerRowWinner,
            ]}>
                {isCompleted && match.winner_id === p1?.id && (
                    <Text style={styles.trophy}>🏆</Text>
                )}
                <Text
                    style={[
                        styles.playerName,
                        isCompleted && match.winner_id === p1?.id && styles.playerNameWinner,
                        !p1 && styles.playerTbd,
                    ]}
                    numberOfLines={1}
                >
                    {p1?.full_name ?? 'TBD'}
                </Text>
            </View>

            <View style={styles.vsDivider}>
                <View style={styles.vsDividerLine} />
                <Text style={styles.vsText}>vs</Text>
                <View style={styles.vsDividerLine} />
            </View>

            {/* Player 2 */}
            <View style={[
                styles.playerRow,
                isCompleted && match.winner_id === p2?.id && styles.playerRowWinner,
            ]}>
                {isCompleted && match.winner_id === p2?.id && (
                    <Text style={styles.trophy}>🏆</Text>
                )}
                <Text
                    style={[
                        styles.playerName,
                        isCompleted && match.winner_id === p2?.id && styles.playerNameWinner,
                        !p2 && styles.playerTbd,
                    ]}
                    numberOfLines={1}
                >
                    {p2?.full_name ?? 'TBD'}
                </Text>
            </View>

            {/* Score */}
            {isCompleted && match.score && (
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{match.score}</Text>
                </View>
            )}

            {!isCompleted && (
                <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 16, gap: 16 },

    header: {
        backgroundColor: '#0f4c81', borderRadius: 16,
        padding: 18, gap: 4,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
    headerSub: { fontSize: 13, color: '#93c5fd' },

    bracketRow: { flexDirection: 'row', gap: 12, paddingBottom: 8 },

    roundColumn: { width: 160, gap: 10 },
    roundLabel: {
        fontSize: 11, fontWeight: '700', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 0.8,
        textAlign: 'center',
    },
    matchesColumn: { gap: 10 },

    matchCard: {
        backgroundColor: '#ffffff', borderRadius: 14,
        padding: 12, gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    matchCardDone: { borderLeftWidth: 3, borderLeftColor: '#0f4c81' },
    matchNum: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

    playerRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 4, paddingHorizontal: 6,
        borderRadius: 8, gap: 4,
    },
    playerRowWinner: { backgroundColor: '#eff6ff' },
    trophy: { fontSize: 12 },
    playerName: { fontSize: 13, color: '#334155', fontWeight: '600', flex: 1 },
    playerNameWinner: { color: '#0f4c81', fontWeight: '800' },
    playerTbd: { color: '#94a3b8', fontStyle: 'italic' },

    vsDivider: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2,
    },
    vsDividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
    vsText: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },

    scoreBadge: {
        backgroundColor: '#dcfce7', borderRadius: 8,
        paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'center',
    },
    scoreText: { fontSize: 12, fontWeight: '800', color: '#166534' },

    pendingBadge: {
        backgroundColor: '#f1f5f9', borderRadius: 8,
        paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'center',
    },
    pendingText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

    empty: { alignItems: 'center', marginTop: 60, gap: 8 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
    emptySubText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
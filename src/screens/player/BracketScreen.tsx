import {
    View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerStackParamList } from '@/navigation/PlayerNavigator';
import { useMatches, MatchWithPlayers } from '@/hooks/useMatches';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Props = NativeStackScreenProps<PlayerStackParamList, 'Bracket'>;

const SLOT_BASE = 120;
const CARD_W   = 152;
const CONN_W   = 28;

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

    // Total bracket height = number of R1 virtual slots × SLOT_BASE
    // R1 virtual slots = 2^(totalRounds-1)
    const totalHeight = Math.pow(2, totalRounds - 1) * SLOT_BASE;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll}>

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
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 8 }}
                    >
                        <View>
                            {/* Round label row */}
                            <View style={styles.labelsRow}>
                                {rounds.flatMap((round, i) => {
                                    const label = (
                                        <View key={`lbl-${round}`} style={{ width: CARD_W, alignItems: 'center' }}>
                                            <Text style={styles.roundLabel}>
                                                {getRoundLabel(round, totalRounds)}
                                            </Text>
                                        </View>
                                    );
                                    if (i < rounds.length - 1) {
                                        return [label, <View key={`lbl-gap-${round}`} style={{ width: CONN_W }} />];
                                    }
                                    return [label];
                                })}
                            </View>

                            {/* Bracket body */}
                            <View style={{ flexDirection: 'row', height: totalHeight }}>
                                {rounds.flatMap((round, roundIdx) => {
                                    const slotH      = SLOT_BASE * Math.pow(2, round - 1);
                                    const slotCount  = Math.pow(2, totalRounds - round);
                                    const roundMatches = matches.filter(m => m.round === round);

                                    // Sequential display numbers by ascending match_number
                                    const sorted = [...roundMatches].sort((a, b) => a.match_number - b.match_number);
                                    const displayMap = new Map(sorted.map((m, i) => [m.id, i + 1]));

                                    const col = (
                                        <View key={`col-${round}`} style={{ width: CARD_W, height: totalHeight }}>
                                            {Array.from({ length: slotCount }, (_, slotIdx) => {
                                                const match = roundMatches.find(m => m.match_number === slotIdx + 1);
                                                return (
                                                    <View
                                                        key={slotIdx}
                                                        style={{
                                                            height: slotH,
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            paddingHorizontal: 2,
                                                        }}
                                                    >
                                                        {match ? (
                                                            <MatchCard
                                                                match={match}
                                                                displayNumber={displayMap.get(match.id) ?? slotIdx + 1}
                                                            />
                                                        ) : null}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );

                                    if (roundIdx < rounds.length - 1) {
                                        return [
                                            col,
                                            <ConnectorColumn
                                                key={`conn-${round}`}
                                                leftSlotH={slotH}
                                                leftSlotCount={slotCount}
                                                totalHeight={totalHeight}
                                            />,
                                        ];
                                    }
                                    return [col];
                                })}
                            </View>
                        </View>
                    </ScrollView>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

// Draws bracket connector lines between two adjacent rounds.
// For each pair of left slots (2i, 2i+1), draws:
//   - horizontal stubs out from each slot's center
//   - vertical line connecting them
//   - horizontal line from midpoint toward next round
function ConnectorColumn({
    leftSlotH, leftSlotCount, totalHeight,
}: {
    leftSlotH: number;
    leftSlotCount: number;
    totalHeight: number;
}) {
    const pairCount = leftSlotCount / 2;
    const lines = [];

    for (let i = 0; i < pairCount; i++) {
        const topY    = i * 2 * leftSlotH + leftSlotH / 2;
        const bottomY = (i * 2 + 1) * leftSlotH + leftSlotH / 2;
        const midY    = (topY + bottomY) / 2;
        const halfW   = CONN_W / 2;

        lines.push(
            <View key={`th-${i}`}  style={[styles.line, styles.hLine, { top: topY - 0.5,    left: 0,     width: halfW }]} />,
            <View key={`bh-${i}`}  style={[styles.line, styles.hLine, { top: bottomY - 0.5, left: 0,     width: halfW }]} />,
            <View key={`v-${i}`}   style={[styles.line, styles.vLine, { top: topY,          left: halfW - 0.5, height: bottomY - topY }]} />,
            <View key={`oh-${i}`}  style={[styles.line, styles.hLine, { top: midY - 0.5,    left: halfW, width: halfW }]} />,
        );
    }

    return (
        <View style={{ width: CONN_W, height: totalHeight, position: 'relative' }}>
            {lines}
        </View>
    );
}

function MatchCard({ match, displayNumber }: { match: MatchWithPlayers; displayNumber: number }) {
    const isCompleted = match.status === 'completed';
    const p1 = match.player1;
    const p2 = match.player2;

    return (
        <View style={[styles.matchCard, isCompleted && styles.matchCardDone]}>
            <Text style={styles.matchNum}>Match {displayNumber}</Text>

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
    scroll:    { padding: 16, gap: 16 },

    header: {
        backgroundColor: '#0f4c81', borderRadius: 16,
        padding: 18, gap: 4,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
    headerSub:   { fontSize: 13, color: '#93c5fd' },

    labelsRow: { flexDirection: 'row', marginBottom: 8 },
    roundLabel: {
        fontSize: 11, fontWeight: '700', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 0.8,
        textAlign: 'center',
    },

    matchCard: {
        width: CARD_W - 4,
        backgroundColor: '#ffffff', borderRadius: 14,
        padding: 10, gap: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
    },
    matchCardDone: { borderLeftWidth: 3, borderLeftColor: '#0f4c81' },
    matchNum: { fontSize: 10, color: '#64748b', fontWeight: '600' },

    playerRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 3, paddingHorizontal: 5,
        borderRadius: 8, gap: 4,
    },
    playerRowWinner: { backgroundColor: '#eff6ff' },
    trophy: { fontSize: 11 },
    playerName: { fontSize: 12, color: '#334155', fontWeight: '600', flex: 1 },
    playerNameWinner: { color: '#0f4c81', fontWeight: '800' },
    playerTbd: { color: '#94a3b8', fontStyle: 'italic' },

    vsDivider: {
        flexDirection: 'row', alignItems: 'center', gap: 5, marginVertical: 1,
    },
    vsDividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
    vsText: { fontSize: 10, color: '#64748b', fontWeight: '700' },

    scoreBadge: {
        backgroundColor: '#dcfce7', borderRadius: 8,
        paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'center',
    },
    scoreText: { fontSize: 11, fontWeight: '800', color: '#166534' },

    pendingBadge: {
        backgroundColor: '#f1f5f9', borderRadius: 8,
        paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'center',
    },
    pendingText: { fontSize: 10, color: '#64748b', fontWeight: '600' },

    // Connector lines
    line:  { position: 'absolute' },
    hLine: { height: 1, backgroundColor: '#cbd5e1' },
    vLine: { width: 1, backgroundColor: '#cbd5e1' },

    empty: { alignItems: 'center', marginTop: 60, gap: 8 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
    emptySubText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});

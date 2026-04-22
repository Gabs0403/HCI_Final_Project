import { useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTournaments } from '@/hooks/useTournaments';
import { Tournament, TournamentStatus } from '@/types';
import { PlayerStackParamList } from '@/navigation/PlayerNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type Props = NativeStackScreenProps<PlayerStackParamList, 'TournamentList'>;

type FilterKey = 'all' | TournamentStatus;

const STATUS_COLORS: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
    upcoming:          { bg: '#e0e7ff', text: '#3730a3', label: 'Upcoming' },
    registration_open: { bg: '#dcfce7', text: '#166534', label: 'Open' },
    in_progress:       { bg: '#fef9c3', text: '#854d0e', label: 'In Progress' },
    completed:         { bg: '#f1f5f9', text: '#475569', label: 'Completed' },
};

const SURFACE_EMOJI: Record<string, string> = {
    hard: '🔵', clay: '🟤', grass: '🟢', indoor: '⚪',
};

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',               label: 'All' },
    { key: 'registration_open', label: 'Open' },
    { key: 'upcoming',          label: 'Upcoming' },
    { key: 'in_progress',       label: 'In Progress' },
    { key: 'completed',         label: 'Completed' },
];

export function TournamentListScreen({ navigation }: Props) {
    const { data: tournaments, loading, refetch } = useTournaments();
    const { userProfile, signOut } = useAuth();
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

    const filtered = activeFilter === 'all'
        ? tournaments
        : tournaments.filter(t => t.status === activeFilter);

    const renderItem = ({ item }: { item: Tournament }) => {
        const status = STATUS_COLORS[item.status];
        const spotsLeft = item.max_players - item.current_players;
        const isFull = spotsLeft <= 0;
        const canRegister = item.status === 'registration_open' && !isFull;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`View details for ${item.name}`}
                onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>

                <Text style={styles.cardMeta}>📍 {item.location}</Text>
                <Text style={styles.cardMeta}>
                    {SURFACE_EMOJI[item.surface] ?? '🎾'} {item.surface.charAt(0).toUpperCase() + item.surface.slice(1)}
                    {'   '}📅 {new Date(item.start_date).toLocaleDateString()}
                </Text>

                <View style={styles.cardFooter}>
                    <View style={styles.spotsRow}>
                        <Text style={styles.spotsText}>👥 {item.current_players}/{item.max_players}</Text>
                        <Text style={[styles.spotsLabel, isFull && styles.spotsFull]}>
                            {isFull ? '· Full' : `· ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                        </Text>
                    </View>
                    <View style={[styles.feeBadge, canRegister && styles.feeBadgeActive]}>
                        <Text style={[styles.feeText, canRegister && styles.feeTextActive]}>
                            ${Number(item.entry_fee).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {canRegister && (
                    <Text style={styles.registerHint}>Tap to register →</Text>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) return <LoadingSpinner message="Loading tournaments..." />;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>🎾 Tournaments</Text>
                    <Text style={styles.headerSub}>Welcome, {userProfile?.full_name ?? 'Player'}</Text>
                </View>
                <TouchableOpacity
                    onPress={signOut}
                    style={styles.signOutBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                >
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            {/* Filter chips */}
            <View style={styles.filterBar}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                >
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.chip, activeFilter === f.key && styles.chipActive]}
                            onPress={() => setActiveFilter(f.key)}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter: ${f.label}`}
                        >
                            <Text style={[styles.chipText, activeFilter === f.key && styles.chipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={t => t.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>🎾</Text>
                        <Text style={styles.emptyText}>
                            {activeFilter === 'all' ? 'No tournaments available.' : `No ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} tournaments.`}
                        </Text>
                        <Text style={styles.emptySubText}>Check back soon!</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f4c81' },
    headerSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
    signOutBtn: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
    signOutText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

    filterBar: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    },
    filterScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    chip: {
        paddingHorizontal: 14, minHeight: 44, justifyContent: 'center',
        borderRadius: 22, backgroundColor: '#f1f5f9',
        borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    chipActive: { backgroundColor: '#0f4c81', borderColor: '#0f4c81' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
    chipTextActive: { color: '#ffffff' },

    list: { padding: 16, gap: 12 },
    card: {
        backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    cardMeta: { fontSize: 13, color: '#64748b' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    spotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    spotsText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    spotsLabel: { fontSize: 13, color: '#64748b' },
    spotsFull: { color: '#dc2626' },
    feeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#f1f5f9' },
    feeBadgeActive: { backgroundColor: '#eff6ff' },
    feeText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    feeTextActive: { color: '#0f4c81' },
    registerHint: { fontSize: 12, color: '#0f4c81', fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 80, gap: 8 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
    emptySubText: { fontSize: 13, color: '#64748b' },
});

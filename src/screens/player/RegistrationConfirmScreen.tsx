import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PlayerStackParamList } from '@/navigation/PlayerNavigator';

type Props = NativeStackScreenProps<PlayerStackParamList, 'RegistrationConfirm'>;

export function RegistrationConfirmScreen({ route, navigation }: Props) {
    const { tournamentName, tournamentId } = route.params;

    // Simple scale-in animation for the checkmark
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.content}>

                {/* Animated checkmark */}
                <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
                    <Text style={styles.checkEmoji}>✓</Text>
                </Animated.View>

                <Animated.View style={[styles.textBlock, { opacity }]}>
                    <Text style={styles.heading}>You're In!</Text>
                    <Text style={styles.subheading}>
                        Successfully registered for
                    </Text>
                    <Text style={styles.tournamentName}>{tournamentName}</Text>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoLine}>📧 Confirmation saved to your account</Text>
                        <Text style={styles.infoLine}>📅 Check tournament details for match schedule</Text>
                        <Text style={styles.infoLine}>🎾 Show up 15 min before your match</Text>
                    </View>
                </Animated.View>

                {/* Actions */}
                <Animated.View style={[styles.actions, { opacity }]}>
                    <TouchableOpacity
                        style={styles.bracketBtn}
                        onPress={() => navigation.replace('Bracket', { tournamentId, tournamentName })}
                        accessibilityRole="button"
                        accessibilityLabel="View tournament bracket"
                    >
                        <Text style={styles.bracketBtnText}>🏆 View Bracket</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.homeBtn}
                        onPress={() => navigation.popToTop()}
                        accessibilityRole="button"
                        accessibilityLabel="Back to tournament list"
                    >
                        <Text style={styles.homeBtnText}>Back to Tournaments</Text>
                    </TouchableOpacity>
                </Animated.View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 24,
    },

    checkCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#0f4c81',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0f4c81', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    checkEmoji: { fontSize: 48, color: '#ffffff', fontWeight: '800' },

    textBlock: { alignItems: 'center', gap: 6 },
    heading: { fontSize: 32, fontWeight: '900', color: '#0f4c81' },
    subheading: { fontSize: 15, color: '#64748b' },
    tournamentName: {
        fontSize: 18, fontWeight: '800', color: '#1e293b',
        textAlign: 'center', marginTop: 2,
    },

    infoBox: {
        backgroundColor: '#eff6ff', borderRadius: 14,
        padding: 16, marginTop: 8, gap: 8, width: '100%',
    },
    infoLine: { fontSize: 13, color: '#1e40af', fontWeight: '500' },

    actions: { width: '100%', gap: 10 },
    bracketBtn: {
        height: 52, backgroundColor: '#0f4c81', borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0f4c81', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    bracketBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

    homeBtn: {
        height: 52, backgroundColor: '#f1f5f9', borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    homeBtnText: { color: '#0f4c81', fontWeight: '700', fontSize: 15 },
});
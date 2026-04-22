import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface Props {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: Props) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color="#0f4c81" />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  text: {
    fontSize: 14,
    color: '#6b7280',
  },
});

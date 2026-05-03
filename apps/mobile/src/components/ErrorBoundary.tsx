import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
            App Error
          </Text>
          <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>
            {this.state.error.message}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>
            {this.state.error.stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AnimatedTabIcon } from '@/components/animated-tab-icon';
import { useSession } from '@/context/session';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { profile, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].card,
          borderTopColor: Colors[colorScheme].border,
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'today' : 'today-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Micro-gap',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'flash' : 'flash-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'document-text' : 'document-text-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="doubts"
        options={{
          title: 'Doubts',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'help-circle' : 'help-circle-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'trending-up' : 'trending-up-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

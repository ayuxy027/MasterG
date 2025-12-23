import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const TabIcon = ({ focused, name, title }: { focused: boolean; name: any; title: string }) => {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <Feather name={name} size={24} color={focused ? '#F97316' : '#9CA3AF'} />
      <Text style={[styles.tabLabel, { color: focused ? '#F97316' : '#9CA3AF', fontWeight: focused ? '600' : '500' }]}>
        {title}
      </Text>
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            bottom: 25,
            left: 20,
            right: 20,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5,
            paddingBottom: 0,
          },
          default: {
            position: 'absolute',
            bottom: 25,
            left: 20,
            right: 20,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            paddingBottom: 0,
          },
        }),
        tabBarItemStyle: {
          height: 72,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" title="Home" />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Stitch', // Renamed from Learn
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="layers" title="Stitch" />, // Changed icon to 'layers' to suit 'Stitch'
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="message-circle" title="Ask" />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="camera" title="Scan" />,
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    width: 64,
    height: 64,
    gap: 2,
    paddingTop: 8, // Push items down slightly
  },
  tabItemFocused: {
    backgroundColor: '#FFF7ED', // Orange-50
  },
  tabLabel: {
    fontSize: 10,
  },
});


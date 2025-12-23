import { ModelStatusCard } from '@/components/ModelStatusCard';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AITestDashboard() {
    const router = useRouter();

    const menuItems = [
        {
            title: 'Model Manager',
            description: 'Download and manage AI models',
            route: '/ai-test/models',
            icon: 'download-outline' as const,
            color: '#4f46e5',
        },
        {
            title: 'Content Generation',
            description: 'Generate educational content with AI',
            route: '/ai-test/content-gen',
            icon: 'document-text-outline' as const,
            color: '#0ea5e9',
        },
        {
            title: 'PDF Q&A',
            description: 'Chat with PDF documents',
            route: '/ai-test/pdf-qa',
            icon: 'chatbubbles-outline' as const,
            color: '#10b981',
        },
        {
            title: 'Document Scanner',
            description: 'Scan and analyze documents',
            route: '/ai-test/scanner',
            icon: 'scan-outline' as const,
            color: '#f59e0b',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'AI Test Dashboard', headerShown: true }} />
            <ScrollView contentContainerStyle={styles.content}>

                <ModelStatusCard />

                <Text style={styles.sectionTitle}>AI Tools</Text>
                <View style={styles.grid}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.card}
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                <Ionicons name={item.icon} size={24} color="white" />
                            </View>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardDescription}>{item.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.noteContainer}>
                    <Text style={styles.noteTitle}>⚠️ Initial Setup</Text>
                    <Text style={styles.noteText}>
                        1. Go to Model Manager and download the models first.
                        2. Click "Initialize AI Engine" in the status card above.
                        3. Then use the tools below.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    content: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 16,
    },
    noteContainer: {
        backgroundColor: '#fffbeb',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    noteTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400e',
        marginBottom: 4,
    },
    noteText: {
        fontSize: 13,
        color: '#b45309',
        lineHeight: 20,
    },
});

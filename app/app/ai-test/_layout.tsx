import { Stack } from 'expo-router';

export default function AITestLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'AI Dashboard' }} />
            <Stack.Screen name="models" options={{ title: 'Model Manager' }} />
            <Stack.Screen name="content-gen" options={{ title: 'Content Generator' }} />
            <Stack.Screen name="pdf-qa" options={{ title: 'PDF Q&A' }} />
            <Stack.Screen name="scanner" options={{ title: 'Document Scanner' }} />
        </Stack>
    );
}

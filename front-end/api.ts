const BASE_URL = 'http://localhost:8000/api';

export interface InspirationResponse {
    results: { title: string; content: string; url: string }[];
    error?: string;
    message?: string;
}

export const api = {
    inspiration: async (query: string): Promise<InspirationResponse> => {
        const response = await fetch(`${BASE_URL}/inspiration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (!response.ok) throw new Error('Inspiration API failed');
        return response.json();
    },

    chat: async (
        messages: { role: string; content: string }[],
        contextData: string,
        currentChapter: number,
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/chat/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                context_data: contextData,
                current_chapter: currentChapter
            }),
        });

        if (!response.ok) throw new Error('Chat API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    updateEntity: async (
        projectId: string,
        entityType: string,
        entityId: string,
        payload: any,
        currentChapter: number
    ) => {
        const response = await fetch(`${BASE_URL}/entities/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                entity_type: entityType,
                entity_id: entityId,
                payload,
                current_chapter: currentChapter
            }),
        });
        if (!response.ok) throw new Error('Entity Update API failed');
        return response.json();
    },

    deleteEntity: async (
        projectId: string,
        entityType: string,
        entityId: string
    ) => {
        const response = await fetch(`${BASE_URL}/entities/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                entity_type: entityType,
                entity_id: entityId
            }),
        });
        if (!response.ok) throw new Error('Entity Delete API failed');
        return response.json();
    },

    retrieveContext: async (
        projectId: string,
        query: string,
        currentChapter: number,
        limit: number = 3
    ) => {
        const response = await fetch(`${BASE_URL}/context/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                query,
                current_chapter: currentChapter,
                limit
            }),
        });
        if (!response.ok) throw new Error('Context Retrieve API failed');
        return response.json();
    },

    // --- Project Management ---

    getProjects: async () => {
        const response = await fetch(`${BASE_URL}/projects`);
        if (!response.ok) throw new Error('Get Projects API failed');
        return response.json();
    },

    createProject: async (name: string, description: string, metaInfo: any) => {
        const response = await fetch(`${BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, meta_info: metaInfo }),
        });
        if (!response.ok) throw new Error('Create Project API failed');
        return response.json();
    },

    getProject: async (projectId: string) => {
        const response = await fetch(`${BASE_URL}/projects/${projectId}`);
        if (!response.ok) throw new Error('Get Project API failed');
        return response.json();
    },

    updateProject: async (projectId: string, data: any) => {
        const response = await fetch(`${BASE_URL}/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Update Project API failed');
        return response.json();
    },

    deleteProject: async (projectId: string) => {
        const response = await fetch(`${BASE_URL}/projects/${projectId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Delete Project API failed');
        return response.json();
    },

    // --- Chapter Management ---

    updateChapter: async (chapterId: string, data: any) => {
        const response = await fetch(`${BASE_URL}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Update Chapter API failed');
        return response.json();
    },

    // --- Genesis Wizard ---

    generateConcept: async (
        userInput: string,
        inspirationContext: string = '',
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/concept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                inspiration_context: inspirationContext
            }),
        });

        if (!response.ok) throw new Error('Generate Concept API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    generateSkeleton: async (
        userInput: string,
        inspirationContext: string = '',
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/skeleton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                inspiration_context: inspirationContext
            }),
        });

        if (!response.ok) throw new Error('Generate Skeleton API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    generateProtagonist: async (
        userInput: string,
        currentData: any,
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/protagonist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                current_data: currentData
            }),
        });

        if (!response.ok) throw new Error('Generate Protagonist API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    generateWorld: async (
        userInput: string,
        currentData: any,
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/world`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                current_data: currentData
            }),
        });

        if (!response.ok) throw new Error('Generate World API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    generateOutline: async (
        userInput: string,
        currentData: any,
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/outline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                current_data: currentData
            }),
        });

        if (!response.ok) throw new Error('Generate Outline API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    generateUnified: async (
        userInput: string,
        currentData: any,
        inspirationContext: string = '',
        onUpdate: (data: any) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/unified`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                current_data: currentData,
                inspiration_context: inspirationContext
            }),
        });

        if (!response.ok) throw new Error('Generate Unified API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        onUpdate(data);
                    } catch (e) {
                        console.error("Error parsing NDJSON line", e);
                    }
                }
            }
        }
    },

    generateFirstChapter: async (
        userInput: string,
        currentData: any,
        onChunk: (chunk: string) => void
    ): Promise<void> => {
        const response = await fetch(`${BASE_URL}/genesis/first_chapter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                current_data: currentData
            }),
        });

        if (!response.ok) throw new Error('Generate First Chapter API failed');
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    },

    suggestTitle: async (projectData: any) => {
        const response = await fetch(`${BASE_URL}/genesis/suggest_title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_data: projectData
            }),
        });

        if (!response.ok) throw new Error('Suggest Title API failed');
        return response.json();
    },

    generateChapter: async (
        projectId: string,
        instructions: string,
        previousChapterId?: string,
        onChunk?: (chunk: string) => void,
        onContext?: (context: any) => void
    ) => {
        const response = await fetch(`${BASE_URL}/chapters/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                instructions,
                previous_chapter_id: previousChapterId
            })
        });

        if (!response.ok) throw new Error('Failed to generate chapter');
        if (!response.body) return { content: "" };

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let isFirstChunk = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            if (isFirstChunk) {
                const firstLineEnd = chunk.indexOf('\n');
                if (firstLineEnd !== -1) {
                    const firstLine = chunk.substring(0, firstLineEnd);
                    try {
                        if (firstLine.trim().startsWith('{')) {
                            const data = JSON.parse(firstLine);
                            if (data.type === 'context_summary') {
                                if (onContext) onContext(data.data);
                                // Process the rest as text
                                const rest = chunk.substring(firstLineEnd + 1);
                                fullText += rest;
                                if (onChunk) onChunk(rest);
                                isFirstChunk = false;
                                continue;
                            }
                        }
                    } catch (e) {
                        // Not JSON, proceed as normal text
                    }
                }
                isFirstChunk = false;
            }

            fullText += chunk;
            if (onChunk) onChunk(chunk);
        }

        return { content: fullText, summary: "" };
    },

    createChapter: async (projectId: string, data: any) => {
        const response = await fetch(`${BASE_URL}/projects/${projectId}/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create chapter');
        return response.json();
    },
};

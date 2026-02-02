export const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const bufferToBlob = (bufferData: any, type: string = 'application/pdf'): Blob | null => {
    if (!bufferData) return null;

    // If it's already a Blob (unlikely but safe)
    if (bufferData instanceof Blob) return bufferData;

    // Prisma/Express JSON format for Buffer
    if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
        return new Blob([new Uint8Array(bufferData.data)], { type });
    }

    // If it comes as a base64 string
    if (typeof bufferData === 'string') {
        const byteCharacters = atob(bufferData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    }

    return null;
};

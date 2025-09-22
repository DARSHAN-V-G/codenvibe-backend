import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import type { Request } from 'express';

// Get Cloudinary URL from environment
const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (!cloudinaryUrl) {
    throw new Error('CLOUDINARY_URL environment variable is required');
}

// Cloudinary automatically configures itself using CLOUDINARY_URL
cloudinary.config();

// Test the connection and configuration
async function testCloudinaryConnection() {
    try {
        // Test API access
        const pingResult = await cloudinary.api.ping();
        console.log('Cloudinary API Status: ✅ Connected');
        console.log('API Version:', pingResult.api_version);

        // Test upload access (optional)
        const uploadResult = await cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', {
            folder: 'codenvibe_round2',
            public_id: 'test-connection'
        });
        console.log('Cloudinary Upload Test: ✅ Successful');
        
        // Clean up test upload
        await cloudinary.uploader.destroy(uploadResult.public_id);
        console.log('Cloudinary Configuration: ✅ Valid');
    } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        console.error('Cloudinary Connection Error: ❌', errorMessage);
        throw new Error('Failed to connect to Cloudinary: ' + errorMessage);
    }
}

// Export the test function instead of running it immediately
export { testCloudinaryConnection };

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: Request, file: Express.Multer.File) => ({
        folder: "codenvibe_round2",
        resource_type: "auto",
        format: file.mimetype.split("/")[1],
        access_mode: "authenticated",
    }),
});

export { cloudinary, storage };
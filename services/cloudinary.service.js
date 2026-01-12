// services/cloudinary.service.js

const CLOUDINARY_CLOUD_NAME = 'dbtucc6v2';
const CLOUDINARY_UPLOAD_PRESET = 'skore_point_unsigned'; // IMPORTANT: Create this in your Cloudinary settings
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Uploads a file to Cloudinary using an unsigned upload preset.
 * @param {File} file The file to upload.
 * @param {string} folder The Cloudinary folder to upload the file into.
 * @returns {Promise<string>} A promise that resolves with the secure URL of the uploaded file.
 */
async function uploadToCloudinary(file, folder) {
    if (!file) {
        throw new Error('No file provided for upload.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    try {
        const response = await fetch(CLOUDINARY_API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
        }

        const data = await response.json();
        console.log('Cloudinary upload successful:', data);
        return data.secure_url;

    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}

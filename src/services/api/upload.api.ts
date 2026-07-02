import apiClient from './client'

export const uploadApi = {
  async uploadImage(file: File, type: 'product' | 'avatar' | 'logo' = 'logo'): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)
    const response = await apiClient.post(`/upload/image?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    // Returns URL path like "/uploads/logos/image-123.webp"
    const url = response.data?.data?.url
    if (!url) throw new Error('Upload gagal — tidak ada URL dalam response')
    return url
  },
}

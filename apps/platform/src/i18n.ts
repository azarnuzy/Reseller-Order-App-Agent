import { createFrontendI18n, type Resource } from "@repo/i18n";

const resources = {
  en: {
    common: {
      language: {
        label: "Language",
        options: {
          en: "English",
          id: "Bahasa Indonesia",
        },
      },
      theme: {
        label: "Theme",
        options: {
          dark: "Dark",
          light: "Light",
          system: "System",
        },
      },
      nav: {
        brand: "Reseller Order",
        orderChat: "Order chat",
        profile: "Edit profile",
      },
      sidebar: {
        workspace: "Workspace",
      },
      home: {
        description:
          "The ordering conversation will be connected after the agent workflow is ready.",
        eyebrow: "Workspace ready",
        title: "Order through a conversation",
      },
      profile: {
        description: "Update the display details for the shared guest profile.",
        eyebrow: "Profile settings",
        form: {
          cancel: "Cancel",
          description: "Name is required. Avatar image is optional and must be a public URL.",
          fallbackError: "Failed to save profile.",
          image: "Avatar URL",
          imageDescription: "Leave empty to remove the avatar image.",
          imageInvalid: "Enter a valid http or https image URL.",
          name: "Display name",
          nameDescription: "Use the name people should recognize in the product.",
          nameRequired: "Display name is required.",
          nameTooLong: "Display name must be 100 characters or fewer.",
          save: "Save profile",
          saved: "Profile saved.",
          saving: "Saving...",
          title: "Edit profile",
        },
        preview: {
          description: "A quick check before saving your changes.",
          title: "Preview",
        },
        title: "Edit profile",
      },
    },
  },
  id: {
    common: {
      language: {
        label: "Bahasa",
        options: {
          en: "English",
          id: "Bahasa Indonesia",
        },
      },
      theme: {
        label: "Tema",
        options: {
          dark: "Gelap",
          light: "Terang",
          system: "Sistem",
        },
      },
      nav: {
        brand: "Reseller Order",
        orderChat: "Chat pesanan",
        profile: "Edit profil",
      },
      sidebar: {
        workspace: "Workspace",
      },
      home: {
        description: "Percakapan pemesanan akan dihubungkan setelah alur agen siap.",
        eyebrow: "Workspace siap",
        title: "Pesan melalui percakapan",
      },
      profile: {
        description: "Perbarui detail tampilan untuk profil tamu bersama.",
        eyebrow: "Pengaturan profil",
        form: {
          cancel: "Batal",
          description: "Nama wajib diisi. Gambar avatar opsional dan harus berupa URL publik.",
          fallbackError: "Gagal menyimpan profil.",
          image: "URL avatar",
          imageDescription: "Kosongkan untuk menghapus gambar avatar.",
          imageInvalid: "Masukkan URL gambar http atau https yang valid.",
          name: "Nama tampilan",
          nameDescription: "Gunakan nama yang mudah dikenali di produk.",
          nameRequired: "Nama tampilan wajib diisi.",
          nameTooLong: "Nama tampilan maksimal 100 karakter.",
          save: "Simpan profil",
          saved: "Profil tersimpan.",
          saving: "Menyimpan...",
          title: "Edit profil",
        },
        preview: {
          description: "Periksa cepat sebelum menyimpan perubahan.",
          title: "Pratinjau",
        },
        title: "Edit profil",
      },
    },
  },
} satisfies Resource;

export const i18n = createFrontendI18n({
  appName: "platform",
  defaultNamespace: "common",
  resources,
});

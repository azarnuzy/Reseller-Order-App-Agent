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
        login: "Login",
        orderChat: "Order chat",
        profile: "Edit profile",
      },
      sidebar: {
        workspace: "Workspace",
      },
      auth: {
        login: {
          title: "Reseller Order login",
          email: "Email",
          password: "Password",
          submit: "Login",
          pending: "Logging in...",
          createAccount: "Create a user account",
          fallbackError: "Authentication failed.",
        },
        register: {
          title: "Create user account",
          name: "Name",
          email: "Email",
          password: "Password",
          submit: "Register",
          pending: "Creating...",
          loginLink: "Already have an account?",
          fallbackError: "Registration failed.",
        },
      },
      home: {
        description:
          "The ordering conversation will be connected after the agent workflow is ready.",
        eyebrow: "Workspace ready",
        title: "Order through a conversation",
      },
      shell: {
        logout: "Logout",
        logoutPending: "Logging out...",
        logoutFallbackError: "Failed to log out.",
      },
      profile: {
        description: "Update the display details tied to your user account.",
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
        login: "Masuk",
        orderChat: "Chat pesanan",
        profile: "Edit profil",
      },
      sidebar: {
        workspace: "Workspace",
      },
      auth: {
        login: {
          title: "Masuk Reseller Order",
          email: "Email",
          password: "Kata sandi",
          submit: "Masuk",
          pending: "Sedang masuk...",
          createAccount: "Buat akun pengguna",
          fallbackError: "Autentikasi gagal.",
        },
        register: {
          title: "Buat akun pengguna",
          name: "Nama",
          email: "Email",
          password: "Kata sandi",
          submit: "Daftar",
          pending: "Membuat...",
          loginLink: "Sudah punya akun?",
          fallbackError: "Pendaftaran gagal.",
        },
      },
      home: {
        description: "Percakapan pemesanan akan dihubungkan setelah alur agen siap.",
        eyebrow: "Workspace siap",
        title: "Pesan melalui percakapan",
      },
      shell: {
        logout: "Keluar",
        logoutPending: "Sedang keluar...",
        logoutFallbackError: "Gagal keluar.",
      },
      profile: {
        description: "Perbarui detail tampilan yang terhubung ke akun pengguna.",
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

"use client"
import { useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"

type Translation = { locale: string; contentHtml: string | null }

export default function AdminCookiesPage() {
  const locale = useLocale()
  const { toast } = useToast()

  const locales = useMemo(() => ["tr", "en"], [])
  const [activeTab, setActiveTab] = useState(locale as string)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setValues((prev) => ({ ...prev, [activeTab]: html }))
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/cookies", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch")
        const data: { translations: Translation[] } = await res.json()
        const initial: Record<string, string> = {}
        locales.forEach((lc) => {
          const found = data.translations.find((x) => x.locale === lc)
          initial[lc] = found?.contentHtml || ""
        })
        setValues(initial)
      } catch (err) {
        console.error("Cookies verisi alınamadı", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [locales])

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(values[activeTab] || "")
  }, [editor, activeTab, values])

  const onSave = async () => {
    try {
      const body = {
        locale: activeTab,
        contentHtml: editor?.getHTML() ?? values[activeTab],
      }
      const res = await fetch("/api/admin/cookies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      toast({ title: "Kaydedildi", description: "Çerez politikası içeriği güncellendi." })
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message ?? "Kaydetme başarısız" })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{locale === "tr" ? "Çerez Politikası" : "Cookies Policy"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
            <TabsList>
              {locales.map((lc) => (
                <TabsTrigger key={lc} value={lc}>
                  {lc.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor || loading}>
              {locale === "tr" ? "Kalın" : "Bold"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor || loading}>
              {locale === "tr" ? "İtalik" : "Italic"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor || loading}>
              H1
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor || loading}>
              H2
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} disabled={!editor || loading}>
              H3
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor || loading}>
              {locale === "tr" ? "Madde" : "Bullet"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor || loading}>
              {locale === "tr" ? "Sıralı" : "Ordered"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor || loading}>
              {locale === "tr" ? "Geri" : "Undo"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor || loading}>
              {locale === "tr" ? "İleri" : "Redo"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} disabled={!editor || loading}>
              {locale === "tr" ? "Temizle" : "Clear"}
            </Button>
          </div>

          <div className="mt-4 border rounded p-2 min-h-[200px]">
            {editor ? <EditorContent editor={editor} /> : <div>Yükleniyor…</div>}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={onSave} disabled={!editor || loading}>
              {locale === "tr" ? "Kaydet" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
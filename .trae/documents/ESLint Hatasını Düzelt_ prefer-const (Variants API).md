## Sorun
- Derleme hatası: `src/app/api/products/variants/[id]/route.ts:173:9` → `'variantDimensions' is never reassigned. Use 'const' instead.`

## Çözüm
- İlgili dosyada `let variantDimensions = []` tanımını `const variantDimensions = []` olarak değiştir.
- `const` ile dizi içeriğini `push` ile güncellemek uygun; değişken yeniden atanmadığı için eslint hatası giderilir.

## Etki
- Yalnızca lint hatasını düzeltir; diğer uyarılar derlemeyi durdurmaz.

Onay sonrası bu satırı güncelleyip tekrar derlemeyi doğrulayacağım.
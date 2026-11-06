import 'dotenv/config'
import { prisma } from '@/lib/prisma'

type TranslationSeed = {
  locale: 'tr' | 'en'
  title: string
  excerpt: string
  slug: string
  metaTitle?: string
  metaDescription?: string
  contentHtml: string
}

type PostSeed = {
  slug: string
  author: string
  coverImage: string | null
  published: boolean
  publishedAt: Date
  translations: TranslationSeed[]
}

const posts: PostSeed[] = [
  {
    slug: 'pla-vs-petg-3d-printing-material-guide',
    author: 'Hivhestın',
    coverImage: null,
    published: true,
    publishedAt: new Date('2026-10-15T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: 'pla-mi-petg-mi-3d-baskida-malzeme-secimi',
        title: 'PLA mı PETG mi? 3D Baskıda Malzeme Seçimi',
        excerpt:
          'Dekoratif figürden günlük kullanım parçalarına kadar hangi iş için PLA, hangi iş için PETG daha doğru? Sıcaklık, dayanıklılık ve maliyet karşılaştırması.',
        metaTitle: 'PLA mı PETG mi? 3D Baskı Malzeme Seçimi Rehberi',
        metaDescription:
          'PLA ve PETG arasındaki farklar: baskı sıcaklığı, dayanıklılık, esneklik, dış mekân kullanımı ve maliyet. Doğru malzemeyi seçmek için pratik rehber.',
        contentHtml: `<h2>Önce işi tanımlayın</h2>
<p>3D baskıda malzeme seçimi, parçanın nerede ve nasıl kullanılacağına bağlıdır. Bir raf süsü ile sürekli elle tutulan bir anahtarlık aynı malzemeyle üretilmemelidir. En sık karşılaştırılan iki malzeme olan PLA ve PETG, bu noktada farklı ihtiyaçlara cevap verir.</p>

<h2>PLA: detay ve estetik öncelikli işler</h2>
<p>PLA, mısır nişastası gibi yenilenebilir kaynaklardan üretilen bir biyoplastiktir. Baskısı kolaydır, boyut kararlılığı yüksektir ve ince detayları temiz çıkarır. Bu nedenle dekoratif figürler, maketler, masaüstü objeler ve hediye ürünlerde ilk tercihtir.</p>
<ul>
  <li><strong>Baskı sıcaklığı:</strong> Genellikle 190-220 °C.</li>
  <li><strong>Avantaj:</strong> Keskin detay, düşük çarpılma, geniş renk seçeneği.</li>
  <li><strong>Dikkat:</strong> Yaklaşık 55-60 °C üzerinde yumuşamaya başlar; sıcak araç içi, radyatör üstü ve doğrudan güneş alan yerler için uygun değildir.</li>
</ul>

<h2>PETG: dayanıklılık ve dış mekân</h2>
<p>PETG, PLA’ya göre daha tok ve daha esnektir. Darbe karşısında kırılmak yerine deforme olur; bu da onu günlük kullanım parçaları, tutucular, su teması olan bölgeler ve dış mekân uygulamaları için uygun hâle getirir.</p>
<ul>
  <li><strong>Baskı sıcaklığı:</strong> Genellikle 230-250 °C, tabla 70-85 °C.</li>
  <li><strong>Avantaj:</strong> Yüksek darbe dayanımı, UV ve neme karşı daha iyi performans.</li>
  <li><strong>Dikkat:</strong> Stringing eğilimi daha yüksektir; doğru retraction ve kurutulmuş filament gerekir.</li>
</ul>

<h2>Kısa karar tablosu</h2>
<table>
  <thead><tr><th>Kullanım</th><th>Önerilen</th></tr></thead>
  <tbody>
    <tr><td>Dekoratif figür, biblo, maket</td><td>PLA</td></tr>
    <tr><td>Balkon, banyo, mutfak gibi nemli alanlar</td><td>PETG</td></tr>
    <tr><td>Düşme/darbe riski olan tutucular</td><td>PETG</td></tr>
    <tr><td>İnce yazı ve yüksek detay</td><td>PLA</td></tr>
  </tbody>
</table>

<h2>Filament kalitesi neden önemli?</h2>
<p>Aynı polimer bile nem aldığında baskı kalitesi düşer. PETG nemi daha hızlı çeker; baskı öncesi 60 °C civarında kurutma, yüzey kalitesini belirgin biçimde artırır. PLA’da ise doğrudan güneş ışığı ve sıcak ortam, zamanla deformasyona yol açabilir.</p>

<h2>Sonuç</h2>
<p>Ev dekorasyonu ağırlıklı bir ürün ailesi için PLA doğru başlangıçtır: detaylı görünür, maliyeti dengelidir ve geniş renk yelpazesi sunar. Ancak parça elle sık kullanılacaksa, dış mekânda kalacaksa veya darbe alacaksa PETG’ye geçmek gerekir. Doğru soru “hangisi daha iyi” değil, “bu parça nerede kullanılacak” sorusudur.</p>`,
      },
      {
        locale: 'en',
        slug: 'pla-vs-petg-choosing-3d-printing-material',
        title: 'PLA vs PETG: Choosing the Right 3D Printing Material',
        excerpt:
          'Which jobs suit PLA and which need PETG? A practical comparison of temperature resistance, durability, cost and outdoor use.',
        metaTitle: 'PLA vs PETG: A Practical 3D Printing Material Guide',
        metaDescription:
          'Compare PLA and PETG for 3D printing: print temperatures, strength, flexibility, outdoor performance and cost. Choose the right material for your part.',
        contentHtml: `<h2>Start with the part, not the filament</h2>
<p>The right 3D printing material depends on where the part will live and how it will be handled. A shelf ornament and a keychain that is touched every day should not be produced from the same material. PLA and PETG, the two most common options, solve different problems.</p>

<h2>PLA: detail and appearance first</h2>
<p>PLA is a bioplastic made from renewable sources such as corn starch. It prints easily, holds dimensions well and reproduces fine detail. That makes it the first choice for decorative figures, models, desk objects and gifts.</p>
<ul>
  <li><strong>Print temperature:</strong> usually 190-220 °C.</li>
  <li><strong>Strengths:</strong> sharp detail, low warping, wide colour range.</li>
  <li><strong>Limits:</strong> it starts to soften around 55-60 °C, so avoid hot cars, radiators and direct sun.</li>
</ul>

<h2>PETG: durability and outdoor use</h2>
<p>PETG is tougher and more flexible than PLA. Under impact it deforms instead of shattering, which makes it suitable for everyday parts, holders, wet areas and outdoor applications.</p>
<ul>
  <li><strong>Print temperature:</strong> usually 230-250 °C, bed 70-85 °C.</li>
  <li><strong>Strengths:</strong> high impact resistance, better UV and moisture performance.</li>
  <li><strong>Limits:</strong> it strings more easily; correct retraction and dry filament are essential.</li>
</ul>

<h2>Quick decision table</h2>
<table>
  <thead><tr><th>Use case</th><th>Recommended</th></tr></thead>
  <tbody>
    <tr><td>Decorative figures, models</td><td>PLA</td></tr>
    <tr><td>Balcony, bathroom, kitchen</td><td>PETG</td></tr>
    <tr><td>Holders exposed to drops or impact</td><td>PETG</td></tr>
    <tr><td>Fine text and high detail</td><td>PLA</td></tr>
  </tbody>
</table>

<h2>Why filament quality matters</h2>
<p>Moisture degrades even the best polymer. PETG absorbs water quickly; drying it around 60 °C before printing noticeably improves surface quality. PLA, on the other hand, can deform over time under direct sunlight and heat.</p>

<h2>Conclusion</h2>
<p>For a home decoration range, PLA is the right starting point: crisp detail, balanced cost and a wide colour palette. Move to PETG when a part will be handled often, stay outdoors or take impacts. The useful question is not which material is better, but where the part will be used.</p>`,
      },
    ],
  },
  {
    slug: 'caring-for-3d-printed-decorative-products',
    author: 'Hivhestın',
    coverImage: null,
    published: true,
    publishedAt: new Date('2026-10-28T10:30:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: '3d-baski-dekoratif-urunlerin-bakimi',
        title: '3D Baskı Dekoratif Ürünlerin Bakımı ve Uzun Ömrü',
        excerpt:
          'Temizlik, güneş, ısı ve nem: 3D baskı dekoratif parçaların rengini ve formunu korumak için uygulanabilir bakım önerileri.',
        metaTitle: '3D Baskı Dekoratif Ürünler Nasıl Temizlenir ve Korunur?',
        metaDescription:
          '3D baskı dekoratif ürünlerin bakımı: doğru temizlik, ısı ve güneşten koruma, nem yönetimi, küçük onarımlar ve saklama önerileri.',
        contentHtml: `<h2>Doğru temizlik, en büyük farkı yaratır</h2>
<p>3D baskı parçalar, katman çizgileri nedeniyle tozu tutmaya yatkındır. Aşındırıcı sünger ve çözücü kimyasallar yüzeyde mat lekeler bırakır. Günlük bakım için ılık su ve birkaç damla sıvı sabun yeterlidir.</p>
<ul>
  <li>Tozu önce yumuşak bir fırça veya mikrofiber bezle alın.</li>
  <li>Ilık sabunlu suyla silin; ardından temiz suyla durulayın.</li>
  <li>Yüzeyi tamamen kurulayın; özellikle girintili detaylarda su bırakmayın.</li>
</ul>

<h2>Isı ve güneş: görünmez düşman</h2>
<p>Çoğu dekoratif ürün PLA’dan üretilir ve PLA yaklaşık 55-60 °C’de yumuşamaya başlar. Cam önünde güneş alan bir raf, yaz aylarında bu sıcaklığa kolayca ulaşabilir. Parçayı doğrudan güneş alan yüzeylerden ve radyatör, şömine gibi ısı kaynaklarından uzak tutun.</p>

<h2>Nem ve dış mekân kullanımı</h2>
<p>PLA nemi görece az çeker; yine de banyo gibi sürekli buhar olan alanlarda uzun ömür beklemeyin. Dış mekân veya nemli alanlar için PETG gibi daha dayanıklı bir malzeme tercih edilmelidir. Ahşap görünümlü filamentler ise suyla uzun temas ettiğinde yüzey dokusunu kaybedebilir.</p>

<h2>Küçük onarımlar</h2>
<p>İnce çıkıntılarda oluşan beyaz izler, yüzeyin gerildiğini gösterir. Hafif bir ısı (saç kurutma makinesinin en düşük ayarı) çoğu zaman yeterlidir; ancak parçayı erime noktasına yaklaştırmayın. Kırılan bir parçayı yapıştırırken siyanoakrilat (süper yapıştırıcı) uygundur; yüzeyi önce temizleyip kurulayın.</p>

<h2>Saklama ve sergileme</h2>
<ul>
  <li>Uzun süre kaldırılacak parçaları tozsuz, serin ve kuru bir kutuda saklayın.</li>
  <li>Ağır figürleri tabanından destekleyin; ince çıkıntılardan tutmayın.</li>
  <li>Sergileme sırasında parçalar arasında boşluk bırakın; sürtünme yüzeyde iz bırakır.</li>
</ul>

<h2>Ne zaman profesyonel destek alınmalı?</h2>
<p>Geniş yüzey deformasyonu, katman ayrılması veya rengin bölgesel olarak solması durumunda basit bakım yeterli olmaz. Bu durumda parçanın yeniden basılması, orijinal forma sadık kalmanın en güvenilir yoludur. Doğru filament ve doğru baskı profiliyle üretilen bir parça, düzenli bakımla yıllarca ilk günkü görünümünü korur.</p>`,
      },
      {
        locale: 'en',
        slug: 'caring-for-3d-printed-decorative-products',
        title: 'Caring for 3D Printed Decorative Products',
        excerpt:
          'Cleaning, sunlight, heat and moisture: practical care tips to keep 3D printed decor looking sharp for years.',
        metaTitle: 'How to Clean and Protect 3D Printed Decorative Products',
        metaDescription:
          'Care guide for 3D printed decor: safe cleaning, protection from heat and sunlight, moisture management, small repairs and storage tips.',
        contentHtml: `<h2>Correct cleaning makes the biggest difference</h2>
<p>Layer lines make 3D printed parts prone to trapping dust. Abrasive sponges and solvent chemicals leave dull patches. For routine care, lukewarm water with a few drops of dish soap is enough.</p>
<ul>
  <li>Remove dust first with a soft brush or microfibre cloth.</li>
  <li>Wipe with lukewarm soapy water, then rinse with clean water.</li>
  <li>Dry the surface completely, especially recessed details.</li>
</ul>

<h2>Heat and sunlight: the invisible enemy</h2>
<p>Most decorative products are printed in PLA, which starts to soften around 55-60 °C. A shelf in front of a window can easily reach that temperature in summer. Keep parts away from direct sun and from radiators or fireplaces.</p>

<h2>Moisture and outdoor use</h2>
<p>PLA absorbs relatively little moisture, but do not expect a long life in constantly steamy bathrooms. For outdoor or damp areas, choose a tougher material such as PETG. Wood-look filaments can lose their surface texture after prolonged contact with water.</p>

<h2>Small repairs</h2>
<p>White marks on thin protrusions indicate the surface has been stressed. Gentle heat (the lowest setting of a hair dryer) often helps; avoid approaching the melting point. Cyanoacrylate (super glue) works for broken parts when the surface is clean and dry.</p>

<h2>Storage and display</h2>
<ul>
  <li>Store parts you rotate out in a dust-free, cool and dry box.</li>
  <li>Support heavy figures from the base; never lift them by thin protrusions.</li>
  <li>Leave space between displayed parts; friction leaves marks.</li>
</ul>

<h2>When to ask for help</h2>
<p>Widespread deformation, layer separation or patchy fading cannot be fixed with simple care. Reprinting is the most reliable way to restore the original shape. Produced with the right filament and profile, a well-cared-for part keeps its look for years.</p>`,
      },
    ],
  },
]

async function main() {
  for (const seed of posts) {
    const post = await prisma.blogPost.upsert({
      where: { slug: seed.slug },
      update: {
        author: seed.author,
        coverImage: seed.coverImage,
        published: seed.published,
        publishedAt: seed.publishedAt,
      },
      create: {
        slug: seed.slug,
        author: seed.author,
        coverImage: seed.coverImage,
        published: seed.published,
        publishedAt: seed.publishedAt,
      },
    })

    for (const translation of seed.translations) {
      await prisma.blogPostTranslation.upsert({
        where: { blogPostId_locale: { blogPostId: post.id, locale: translation.locale } },
        update: {
          title: translation.title,
          excerpt: translation.excerpt,
          contentHtml: translation.contentHtml,
          metaTitle: translation.metaTitle ?? null,
          metaDescription: translation.metaDescription ?? null,
          slug: translation.slug,
        },
        create: {
          blogPostId: post.id,
          locale: translation.locale,
          title: translation.title,
          excerpt: translation.excerpt,
          contentHtml: translation.contentHtml,
          metaTitle: translation.metaTitle ?? null,
          metaDescription: translation.metaDescription ?? null,
          slug: translation.slug,
        },
      })
    }

    console.log(`✓ ${seed.slug}`)
  }

  console.log(`Blog seed tamamlandı: ${posts.length} yazı`)
}

main()
  .catch((error) => {
    console.error('Blog seed hatası:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

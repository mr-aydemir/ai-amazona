import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { writeBlogCover } from './blog-cover'

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
  published: boolean
  publishedAt: Date
  translations: TranslationSeed[]
}

const posts: PostSeed[] = [
  {
    slug: 'what-is-3d-printing-beginners-guide',
    author: 'Hivhestın',
    published: true,
    publishedAt: new Date('2026-11-01T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: '3d-baski-nedir-yeni-baslayanlar-rehberi',
        title: '3D Baskı Nedir? Yeni Başlayanlar İçin Rehber',
        excerpt:
          '3D baskının nasıl çalıştığını, hangi malzemelerin kullanıldığını ve ev dekorasyonundan kişiye özel hediyelere kadar günlük kullanım alanlarını sade bir dille anlatıyoruz.',
        metaTitle: '3D Baskı Nedir? Yeni Başlayanlar İçin Rehber',
        metaDescription:
          '3D baskı nasıl çalışır, hangi malzemeler kullanılır ve nerelerde tercih edilir? Yeni başlayanlar için sade bir rehber ve pratik satın alma önerileri.',
        contentHtml: `<p>3D baskı, dijital bir modelin katman katman eritilmiş plastikle fiziksel bir nesneye dönüştürülmesidir. Kulağa karmaşık gelse de temel mantık oldukça basittir: bir tel ısıtılır, ince bir nozuldan geçirilir ve tabla üzerine istenen formda biriktirilir. Ortaya çıkan parça, geleneksel kalıp üretimine göre daha küçük adetlerde ve çok daha esnek tasarımlarla üretilebilir.</p>

<h2>3D baskı aslında ne yapar?</h2>
<p>En yaygın yöntem olan FDM, eritilmiş filamentle çalışır. Model dilimlenir, her katman için bir hareket yolu oluşturulur ve makine bu yolu takip ederek parçayı yavaşça inşa eder. Bu nedenle yüzeyde ince katman çizgileri görülür; doğru ayarlarla bu izler belirgin biçimde azaltılabilir.</p>
<p>Bilgisayarda tasarlanan bir formun birkaç saat içinde elde tutulabilir bir nesneye dönüşmesi, ürün geliştirme ve kişiselleştirme açısından büyük bir avantajdır. Tek bir parça üretmek için kalıp maliyetine katlanmak gerekmez.</p>

<h2>Hangi malzemeler kullanılır?</h2>
<ul>
  <li><strong>PLA:</strong> Detaylı ve dekoratif parçalar için idealdir. Kolay basılır, geniş renk seçeneği sunar.</li>
  <li><strong>PETG:</strong> Daha tok ve esnektir; nemli alanlar ve günlük kullanım parçaları için uygundur.</li>
  <li><strong>TPU:</strong> Esnek parçalar ve darbe emici detaylar için tercih edilir.</li>
</ul>
<p>Malzeme seçimi, parçanın nerede kullanılacağına göre yapılmalıdır. Sıcak bir pencere önünde duracak dekoratif bir figür ile sürekli elde tutulan bir anahtarlık aynı filamentle üretilmemelidir. <a href="/tr/blog/pla-mi-petg-mi-3d-baskida-malzeme-secimi">PLA ve PETG karşılaştırmamız</a> bu kararı vermeyi kolaylaştırır.</p>

<h2>Evde ve hediyede kullanım alanları</h2>
<p>3D baskı ürünleri dekorasyonda figür, biblo, vazo ve duvar objesi olarak; mutfakta düzenleyici ve küçük aksesuar olarak; çalışma masasında kalemlik ve stand olarak kullanılabilir. Kişiye özel isim yazıları, doğum günü süsleri ve kurumsal hediyeler de bu üretim yönteminin güçlü olduğu alanlardır.</p>
<p>Ürün seçerken yüzey kalitesine, katman izlerinin düzgünlüğüne ve parçanın tabanının sağlamlığına bakmak gerekir. <a href="/tr/products">Ürün koleksiyonumuzda</a> malzeme ve kullanım amacına göre filtrelenmiş seçenekleri inceleyebilirsiniz.</p>

<h2>Baskı süresi ve maliyeti ne belirler?</h2>
<p>Parçanın boyutu, doluluk oranı, katman yüksekliği ve seçilen malzeme süreyi doğrudan etkiler. İnce katman yüksekliği daha pürüzsüz bir yüzey sağlar ancak baskı süresini uzatır. Büyük ve içi dolu parçalar hem daha fazla filament hem de daha uzun makine zamanı gerektirir.</p>
<p>Maliyeti değerlendirirken yalnızca filament fiyatına bakmak yanıltıcıdır. Başarısız baskı riski, destek malzemesi, son işlem ve paketleme de toplam maliyetin parçasıdır. Bu nedenle güvenilir bir üreticiyle çalışmak, uzun vadede daha tutarlı sonuç verir.</p>

<h2>Satın alırken nelere dikkat etmeli?</h2>
<ul>
  <li>Parçanın hangi malzemeden üretildiğini ve kullanım koşullarını sorun.</li>
  <li>İnce çıkıntıların desteklenip desteklenmediğine bakın.</li>
  <li>Ürünün ölçülerini ve taban genişliğini kontrol edin.</li>
  <li>Temizlik ve bakım önerilerini öğrenin.</li>
</ul>

<h2>Sonuç</h2>
<p>3D baskı, doğru malzeme ve doğru tasarımla birleştiğinde hem dekoratif hem işlevsel ürünler üretmenin erişilebilir bir yoludur. Yeni başlıyorsanız küçük ve tek parçalı ürünlerle başlamak, katman yapısını ve bakım ihtiyacını anlamanın en kolay yoludur.</p>`,
      },
      {
        locale: 'en',
        slug: 'what-is-3d-printing-beginners-guide',
        title: "What Is 3D Printing? A Beginner's Guide",
        excerpt:
          'How 3D printing works, which materials are used and where printed objects fit into everyday life, from home decor to personalized gifts.',
        metaTitle: "What Is 3D Printing? A Beginner's Guide",
        metaDescription:
          'Learn how 3D printing works, which materials are used and where printed objects are a good fit. A simple guide with practical buying tips.',
        contentHtml: `<p>3D printing turns a digital model into a physical object by building it up layer by layer. The basic idea is simple: plastic filament is heated, pushed through a fine nozzle and deposited on a build plate in the shape of the model. Compared with traditional moulding, this makes small batches and highly customized designs far more practical.</p>

<h2>What does 3D printing actually do?</h2>
<p>The most common method, FDM, uses melted filament. The model is sliced into layers, each layer becomes a toolpath, and the machine follows that path to build the part slowly. This is why printed surfaces show fine layer lines; with the right settings those marks can be reduced significantly.</p>
<p>Turning a computer design into a real object within hours is a major advantage for product development and personalization. You do not need to pay for a mould just to produce a single part.</p>

<h2>Which materials are used?</h2>
<ul>
  <li><strong>PLA:</strong> ideal for detailed decorative parts. It prints easily and comes in a wide range of colours.</li>
  <li><strong>PETG:</strong> tougher and more flexible, suitable for damp areas and everyday parts.</li>
  <li><strong>TPU:</strong> used for flexible parts and impact-absorbing details.</li>
</ul>
<p>The material should be chosen for the place where the part will live. A decorative figure on a sunny windowsill and a keychain handled every day should not use the same filament. Our <a href="/en/blog/pla-vs-petg-choosing-3d-printing-material">PLA and PETG comparison</a> makes that decision easier.</p>

<h2>Where printed objects are useful at home</h2>
<p>Printed products work as figures, ornaments, vases and wall objects in decoration; as small organizers and accessories in the kitchen; and as pen holders and stands on a desk. Personalized name signs, birthday decorations and corporate gifts are also strong use cases for this production method.</p>
<p>When choosing a product, look at surface quality, how clean the layer lines are and how stable the base feels. You can browse options filtered by material and purpose in our <a href="/en/products">product collection</a>.</p>

<h2>What drives print time and cost?</h2>
<p>Part size, infill, layer height and material all affect time directly. A finer layer height produces a smoother surface but takes longer. Large, solid parts need more filament and more machine time.</p>
<p>Looking only at filament price is misleading. Failed prints, support material, finishing and packaging are part of the total cost, which is why working with a reliable producer gives more consistent results over time.</p>

<h2>What to check before buying</h2>
<ul>
  <li>Ask which material was used and what conditions it is suitable for.</li>
  <li>Check whether thin protrusions are properly supported.</li>
  <li>Review the dimensions and the width of the base.</li>
  <li>Learn how to clean and care for the part.</li>
</ul>

<h2>Conclusion</h2>
<p>With the right material and design, 3D printing makes both decorative and functional products accessible. If you are new to it, start with small single-part objects: they are the easiest way to understand layer structure and care requirements.</p>`,
      },
    ],
  },
  {
    slug: '3d-printed-figures-home-decor-ideas',
    author: 'Hivhestın',
    published: true,
    publishedAt: new Date('2026-11-02T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: 'ev-dekorasyonunda-3d-baski-figurler',
        title: 'Ev Dekorasyonunda 3D Baskı Figürler Nasıl Kullanılır?',
        excerpt:
          '3D baskı figürleri doğru yerde, doğru renk ve ölçekle kullanarak evinize kişisel bir dokunuş katmanın pratik yollarını anlatıyoruz.',
        metaTitle: 'Ev Dekorasyonunda 3D Baskı Figür Fikirleri',
        metaDescription:
          '3D baskı figürleri ev dekorasyonunda nasıl kullanılır? Doğru yer seçimi, renk ve doku uyumu, gruplama, ölçek ve bakım için pratik öneriler.',
        contentHtml: `<p>Dekorasyonda figür kullanmak, bir mekâna karakter kazandırmanın en kolay yollarından biridir. 3D baskı figürler ise klasik biblolara göre daha özgün formlar, daha geniş renk seçenekleri ve daha erişilebilir fiyatlar sunar. Ancak iyi bir sonuç için figürün yeri, rengi ve ölçeği birlikte düşünülmelidir.</p>

<h2>Doğru yeri seçin</h2>
<p>Figürlerin en sık kullanıldığı alanlar konsol üstleri, kitaplık rafları, çalışma masaları ve giriş dolaplarıdır. Bir figürü tek başına bir niş içine yerleştirmek dikkat odağı oluşturur; aynı figürü kalabalık bir rafa koymak ise etkisini azaltır. Boşluk bırakmak, figürün görünürlüğünü artırır.</p>
<p>Yüksek raflarda küçük, alçak yüzeylerde daha büyük parçalar tercih edilebilir. Özellikle evcil hayvanı veya küçük çocuğu olan evlerde devrilme riskine karşı tabanı geniş modeller seçilmelidir.</p>

<h2>Renk ve doku uyumu</h2>
<p>Figürün rengi, odanın mevcut paletiyle uyumlu olmalıdır. Nötr bir odada tek bir kırmızı veya hardal tonu canlı bir vurgu yaratır. Ahşap ve doğal dokuların hâkim olduğu bir mekânda mat ve toprak tonları daha dengeli durur.</p>
<p>3D baskıda katman izleri yüzeye karakter katar. Boyasız, mat bir yüzey modern ve sade bir görünüm verirken; parlak vernikli yüzey daha canlı bir etki oluşturur. Aynı rafta farklı doku ve parlaklıkları karıştırmak yerine tek bir dil seçmek daha temiz bir sonuç verir.</p>

<h2>Gruplama ve ölçek</h2>
<p>Birden fazla figür kullanacaksanız bir tema etrafında gruplayın: aynı hayvan ailesi, aynı geometrik dil veya aynı renk ailesi gibi. Üçlü gruplar genellikle dengeli görünür; tek sayılar daha doğal bir ritim oluşturur.</p>
<p>Ölçekte aşırıya kaçmamak gerekir. Çok büyük bir figür küçük bir masayı boğar, çok küçük bir figür ise görünmez. Figürün yüksekliği, yanındaki objelerin yaklaşık yarısı ile üçte biri arasında olduğunda uyum yakalanır.</p>

<h2>Bakım ve sergileme</h2>
<p>Tozu yumuşak bir fırça veya mikrofiber bezle alın. Gerekirse ılık sabunlu suyla silin ve tamamen kurulayın. Doğrudan güneş ve radyatör gibi ısı kaynaklarından uzak tutun. Daha ayrıntılı bilgi için <a href="/tr/blog/3d-baski-dekoratif-urunlerin-bakimi">bakım rehberimize</a> göz atabilirsiniz.</p>
<p>Farklı figürleri mevsimsel olarak değiştirmek, dekorasyonu taze tutmanın pratik bir yoludur. Kullanılmayan parçaları tozsuz bir kutuda saklayın. <a href="/tr/products">Ürün koleksiyonumuzdan</a> mekânınıza uygun figürleri seçebilirsiniz.</p>

<h2>Küçük dokunuşlar</h2>
<p>Bir figürün yanına yerleştirilen küçük bir obje veya farklı yükseklikte bir stand, kompozisyonu daha dinamik hâle getirir. Aynı figürü farklı mevsimlerde başka bir odada kullanmak da dekorasyonu taze tutar. <a href="/tr/products">Ürün koleksiyonumuzdaki</a> seçeneklerle bu düzeni kolayca kurabilirsiniz.</p>
<p>Parçaları doğrudan pencere kenarına koymak yerine ışığı yandan alacak şekilde yerleştirmek, katman detaylarını daha görünür kılar.</p>

<h2>Sonuç</h2>
<p>3D baskı figürler, doğru yerleştirme ve sade bir renk paletiyle evde güçlü bir odak noktası oluşturur. Birkaç iyi seçilmiş parça, rafta düzinelerce obje olmasından daha etkili olur.</p>`,
      },
      {
        locale: 'en',
        slug: 'how-to-use-3d-printed-figures-in-home-decor',
        title: 'How to Use 3D Printed Figures in Home Decor',
        excerpt:
          'Practical ways to use 3D printed figures at home with the right placement, colour, scale and care, without making a room feel cluttered.',
        metaTitle: '3D Printed Figure Ideas for Home Decor',
        metaDescription:
          'How to use 3D printed figures in home decor: placement tips, colour and texture matching, grouping, scale and simple care advice.',
        contentHtml: `<p>Figures are one of the easiest ways to give a room character. Compared with traditional ornaments, 3D printed figures offer more original shapes, a wider colour range and more accessible prices. A good result, however, depends on choosing the right place, colour and scale together.</p>

<h2>Choose the right spot</h2>
<p>Figures work well on console tables, bookshelves, desks and entryway cabinets. A single figure in a niche becomes a focal point; the same figure on a crowded shelf loses impact. Leaving empty space around a piece makes it more visible.</p>
<p>Use smaller pieces on high shelves and larger ones on low surfaces. In homes with pets or small children, choose designs with a wide base to reduce the risk of tipping.</p>

<h2>Colour and texture matching</h2>
<p>The colour of a figure should work with the room's existing palette. In a neutral room, a single red or mustard tone creates a lively accent. In a space dominated by wood and natural textures, matte earth tones feel more balanced.</p>
<p>Layer lines add character to a printed surface. An unpainted matte finish looks modern and understated, while a glossy varnish creates a more vivid effect. Rather than mixing different textures and gloss levels on the same shelf, choose one visual language for a cleaner result.</p>

<h2>Grouping and scale</h2>
<p>If you use more than one figure, group them around a theme: the same animal family, the same geometric language or the same colour family. Groups of three usually feel balanced, and odd numbers create a more natural rhythm.</p>
<p>Avoid extremes in scale. A very large figure overwhelms a small table, while a very small one disappears. Harmony is achieved when a figure's height is roughly one half to one third of the objects beside it.</p>

<h2>Care and display</h2>
<p>Remove dust with a soft brush or microfibre cloth. If needed, wipe with lukewarm soapy water and dry completely. Keep pieces away from direct sun and heat sources such as radiators. For more detail, see our <a href="/en/blog/caring-for-3d-printed-decorative-products">care guide</a>.</p>
<p>Rotating figures by season is a practical way to keep a room feeling fresh. Store unused pieces in a dust-free box. You can choose figures that suit your space from our <a href="/en/products">product collection</a>.</p>

<h2>Conclusion</h2>
<p>With thoughtful placement and a restrained colour palette, 3D printed figures can become a strong focal point at home. A few well-chosen pieces are more effective than dozens of objects on a shelf.</p>`,
      },
    ],
  },
  {
    slug: 'personalized-3d-printed-gifts-guide',
    author: 'Hivhestın',
    published: true,
    publishedAt: new Date('2026-11-03T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: 'kisiye-ozel-3d-baski-hediyeler',
        title: 'Kişiye Özel 3D Baskı Hediyeler: Seçim Rehberi',
        excerpt:
          'İsim yazılı figürlerden anlamlı tarih ve sembollere kadar kişiye özel 3D baskı hediyeleri seçerken nelere dikkat etmeniz gerektiğini anlatıyoruz.',
        metaTitle: 'Kişiye Özel 3D Baskı Hediye Seçim Rehberi',
        metaDescription:
          'Kişiye özel 3D baskı hediyeler seçerken malzeme, dayanıklılık, kişiselleştirme sınırları ve teslimat süresi nasıl değerlendirilir? Pratik rehber.',
        contentHtml: `<p>Kişiye özel hediyeler, standart bir üründen çok daha fazlasını anlatır: hediye edilen kişinin adını, önemli bir tarihi veya ortak bir anı taşır. 3D baskı, bu tür kişiselleştirmeyi küçük adetlerde bile mümkün kılar. Ancak iyi bir hediye seçmek için birkaç noktaya dikkat etmek gerekir.</p>

<h2>Neden kişiye özel ürün?</h2>
<p>İsim, tarih veya kısa bir mesaj eklenmiş bir obje, günlük hayatta sürekli görülen bir hatıraya dönüşür. Masaüstünde duracak bir figür, anahtarlık veya kitaplık süsü, kişisel bir bağ kurmanın en pratik yollarından biridir.</p>
<p>Kişiselleştirme aynı zamanda üretim planlaması gerektirir. Yazının uzunluğu, kullanılacak font ve parçanın ölçüsü birbiriyle uyumlu olmalıdır. Çok uzun bir metin küçük bir figürde okunaksız hâle gelebilir.</p>

<h2>Hediye fikirleri</h2>
<ul>
  <li>İsim veya baş harf taşıyan masaüstü figürleri.</li>
  <li>Doğum günü ve yıl dönümü tarihleri için özel tasarımlar.</li>
  <li>Evcil hayvan figürleri ve anı objeleri.</li>
  <li>Kurumsal etkinlikler için logo ve tarih içeren parçalar.</li>
  <li>Kitaplık ve çalışma masası için küçük düzenleyiciler.</li>
</ul>

<h2>Malzeme ve dayanıklılık</h2>
<p>Hediyenin nasıl kullanılacağı malzemeyi belirler. Raflarda duracak dekoratif bir parça için PLA yeterli olabilir. Sürekli elde tutulacak, çantada taşınacak veya nemli bir ortamda kalacak ürünlerde PETG daha doğru bir seçimdir.</p>
<p>İnce çıkıntılar ve uzun yazılar kırılmaya daha yatkındır. Tasarımı seçerken parçanın tabanının geniş olmasına ve yazının yüzeye gömülü değil, yeterli kalınlıkta olmasına dikkat edin. <a href="/tr/blog/3d-baskili-urunlerin-dayanikliligi">Dayanıklılık rehberimiz</a> bu konuda daha fazla bilgi verir.</p>

<h2>Sipariş öncesi kontrol listesi</h2>
<ul>
  <li>İsim ve tarih yazımını son kez doğrulayın.</li>
  <li>Ürünün ölçülerini ve renk seçeneklerini netleştirin.</li>
  <li>Teslimat süresini özel günden önce planlayın.</li>
  <li>Varsa hediye paketi seçeneğini sorun.</li>
</ul>

<h2>Kişiselleştirme sınırları</h2>
<p>Her tasarım her ölçüde okunaklı olmaz. Küçük bir figürde uzun bir isim veya ince bir font, baskı sırasında kaybolabilir. Bu nedenle sipariş öncesinde yazının boyutunu ve parçanın ölçeğini birlikte değerlendirmek gerekir.</p>
<p>Renk seçimi de kişiselleştirmenin parçasıdır. Hediyenin kullanılacağı mekâna uygun bir ton seçmek, ürünün daha sık kullanılmasını sağlar. Kurumsal hediyelerde logo ve tarih gibi unsurların sade kalması, parçanın uzun süre şık görünmesine yardımcı olur. <a href="/tr/products">Ürün koleksiyonumuzdan</a> kişiselleştirilebilir seçenekleri inceleyebilirsiniz.</p>
<p>Hediye paketi ve teslimat zamanı da deneyimin parçasıdır. Özel günden önce siparişi tamamlamak, son dakika sorunlarını önler. Baskı sonrası küçük bir bakım notu eklemek, hediyenin uzun ömürlü olmasına katkı sağlar.</p>

<h2>Sonuç</h2>
<p>Kişiye özel 3D baskı hediyeler, doğru malzeme ve okunaklı bir tasarımla uzun yıllar saklanan anlamlı objelere dönüşür. Hediye seçerken gösterişten çok kullanım alışkanlığına ve kişisel bağa odaklanmak, en doğru sonucu verir. <a href="/tr/products">Ürünlerimizi</a> inceleyerek size uygun seçenekleri görebilirsiniz.</p>`,
      },
      {
        locale: 'en',
        slug: 'personalized-3d-printed-gifts-buying-guide',
        title: 'Personalized 3D Printed Gifts: A Buying Guide',
        excerpt:
          'From name figures to meaningful dates and symbols, here is what to consider when choosing a personalized 3D printed gift that lasts.',
        metaTitle: 'Personalized 3D Printed Gifts: A Buying Guide',
        metaDescription:
          'Choosing a personalized 3D printed gift: material, durability, personalization limits and delivery timing. A practical guide for meaningful gifts.',
        contentHtml: `<p>A personalized gift carries far more meaning than a standard product: it holds someone's name, an important date or a shared memory. 3D printing makes that kind of personalization possible even for very small batches. Choosing a good gift, however, takes a little care.</p>

<h2>Why choose a personalized object?</h2>
<p>An object with a name, date or short message becomes a keepsake that is seen every day. A small figure on a desk, a keychain or a shelf ornament is one of the simplest ways to create a personal connection.</p>
<p>Personalization also requires production planning. The length of the text, the font and the size of the part need to work together. Very long text can become unreadable on a small figure.</p>

<h2>Gift ideas</h2>
<ul>
  <li>Desktop figures with a name or initials.</li>
  <li>Custom designs for birthdays and anniversaries.</li>
  <li>Pet figures and memorial objects.</li>
  <li>Corporate event pieces with a logo and date.</li>
  <li>Small organizers for shelves and desks.</li>
</ul>

<h2>Material and durability</h2>
<p>How the gift will be used determines the material. PLA can be enough for a decorative piece that stays on a shelf. For items that are handled often, carried in a bag or kept in a damp place, PETG is the better choice.</p>
<p>Thin protrusions and long text are more prone to breaking. When choosing a design, look for a wide base and text that has enough thickness. Our <a href="/en/blog/durability-of-3d-printed-products">durability guide</a> explains this in more detail.</p>

<h2>Checklist before ordering</h2>
<ul>
  <li>Double-check the spelling of names and dates.</li>
  <li>Confirm the dimensions and colour options.</li>
  <li>Plan the delivery date before the special occasion.</li>
  <li>Ask whether gift wrapping is available.</li>
</ul>

<h2>Personalization limits</h2>
<p>Not every design stays readable at every size. Long names or very fine fonts can disappear on a small figure during printing. Before ordering, consider the text size and the scale of the part together.</p>
<p>Colour is part of personalization too. Choosing a tone that suits the room where the gift will live makes it more likely to be used. For corporate gifts, keeping elements such as the logo and date simple helps the piece look good for years. Browse personalized options in our <a href="/en/products">product collection</a>.</p>
<p>Gift packaging and delivery timing are part of the experience as well. Completing the order before the special day avoids last-minute problems, and a short care note helps the gift last longer.</p>

<h2>Conclusion</h2>
<p>With the right material and readable design, personalized 3D printed gifts become meaningful objects kept for years. Focus on how the person will use the item and on the personal connection, rather than on decoration alone. Browse our <a href="/en/products">products</a> to see suitable options.</p>`,
      },
    ],
  },
  {
    slug: '3d-printed-lamps-lighting-ideas',
    author: 'Hivhestın',
    published: true,
    publishedAt: new Date('2026-11-04T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: '3d-baskili-lambalar-aydinlatma-fikirleri',
        title: '3D Baskılı Lambalar ve Aydınlatma Fikirleri',
        excerpt:
          '3D baskılı abajur ve lambaların ışığı nasıl dağıttığını, doğru ampul ve malzeme seçimini, yerleşim ve bakım önerilerini anlatıyoruz.',
        metaTitle: '3D Baskılı Lambalar ve Aydınlatma Fikirleri',
        metaDescription:
          '3D baskılı lamba ve abajur seçerken malzeme, ampul ısısı, ışık dağılımı ve yerleşim nasıl olmalı? Eviniz için pratik aydınlatma fikirleri.',
        contentHtml: `<p>Aydınlatma, bir mekânın atmosferini belirleyen en güçlü unsurlardan biridir. 3D baskılı lambalar, geometrik formları ve ışığı kırma biçimleriyle sıradan abajurlardan ayrılır. Doğru malzeme ve ampulle birleştiğinde hem güvenli hem de karakterli bir sonuç elde edilir.</p>

<h2>Neden 3D baskılı lamba?</h2>
<p>Geleneksel üretimde kalıp maliyeti nedeniyle karmaşık formlar pahalıdır. 3D baskıda ise organik desenler, ince kanallar ve tekrar eden geometriler küçük adetlerde bile üretilebilir. Bu da ışığın yüzeye düşme biçimini tasarlamayı mümkün kılar.</p>
<p>Özellikle rafta küçük bir vurgu ışığı veya çalışma masasında yumuşak bir aydınlatma arıyorsanız, baskılı abajurlar iyi bir alternatif sunar.</p>

<h2>Doğru ampul ve ısı</h2>
<p>3D baskıda kullanılan PLA, yaklaşık 55-60 °C üzerinde yumuşamaya başlar. Bu nedenle lambanın içinde yüksek ısı üreten halogen veya yüksek wattlı ampullerden kaçınmak gerekir. LED ampuller hem daha az ısı üretir hem de daha uzun ömürlüdür.</p>
<p>Ampulün duya tam oturduğundan ve hava akışının kesilmediğinden emin olun. Kapalı formlu abajurlarda küçük havalandırma delikleri bulunmalıdır. PETG ile üretilen parçalar daha yüksek sıcaklığa dayanır, ancak yine de doğrudan ampul temasından kaçınılmalıdır.</p>

<h2>Işık dağılımı ve yerleşim</h2>
<p>Desenli bir abajur, ışığı desenli bir gölgeye dönüştürür. Bu etkiyi görmek için lambayı duvara veya tavana yakın konumlandırmak gerekir. Düz bir yüzeye yakın yerleştirilen lamba daha keskin, uzak yerleştirilen lamba daha yumuşak bir gölge verir.</p>
<p>Yatak odasında düşük ısılı ve sıcak beyaz bir LED tercih edilirken, çalışma masasında daha nötr bir ton okunabilirliği artırır. Aynı odada farklı ışık sıcaklıklarını karıştırmamak, daha dengeli bir görünüm sağlar.</p>

<h2>Malzeme ve bakım</h2>
<p>Lambanın gövdesi sürekli ısıya maruz kaldığı için malzeme seçimi önemlidir. PLA dekoratif ve düşük ısılı kullanım için uygundur; daha yüksek dayanım gereken yerlerde PETG tercih edilmelidir. Tozu yumuşak bir fırçayla alın, nemli bezle silin ve tamamen kurutun.</p>
<p>Daha fazla malzeme bilgisi için <a href="/tr/blog/pla-mi-petg-mi-3d-baskida-malzeme-secimi">PLA ve PETG karşılaştırmamıza</a> göz atabilir, lamba ve dekoratif ürünleri <a href="/tr/products">koleksiyonumuzdan</a> inceleyebilirsiniz.</p>

<h2>Kablo ve güvenlik</h2>
<p>Lamba seçerken yalnızca görünüm değil, kablo yönetimi ve duy kalitesi de önemlidir. Kablonun gergin olmaması, fiş ve duyunun sağlam olması gerekir. Çocuklu evlerde lambayı devrilmeyecek bir yüzeye yerleştirmek ve kabloyu erişim dışında tutmak güvenliği artırır.</p>
<p>Temizlik sırasında lambayı prizden çekin ve yumuşak, hafif nemli bir bez kullanın. Su ve deterjanın elektrik aksamına temas etmemesine dikkat edin. <a href="/tr/products">Ürün koleksiyonumuzdaki</a> lamba ve dekoratif parçaları inceleyebilirsiniz.</p>

<h2>Sonuç</h2>
<p>3D baskılı lambalar, doğru ampul ve güvenli yerleşimle mekâna hem karakter hem işlev katar. Işık sıcaklığını ve gölge etkisini önceden planlamak, sonuçtan memnun kalmanın en kolay yoludur.</p>`,
      },
      {
        locale: 'en',
        slug: '3d-printed-lamps-lighting-ideas',
        title: '3D Printed Lamps and Lighting Ideas',
        excerpt:
          'How 3D printed lamp shades diffuse light, how to choose the right bulb and material, and practical placement and care advice.',
        metaTitle: '3D Printed Lamps and Lighting Ideas',
        metaDescription:
          'Choosing a 3D printed lamp or shade: material, bulb heat, light diffusion and placement. Practical lighting ideas for your home.',
        contentHtml: `<p>Lighting is one of the strongest elements shaping the atmosphere of a room. 3D printed lamps stand out from ordinary shades with their geometric forms and the way they break up light. Combined with the right material and bulb, they are both safe and distinctive.</p>

<h2>Why choose a 3D printed lamp?</h2>
<p>With traditional production, complex shapes are expensive because of mould costs. With 3D printing, organic patterns, fine channels and repeating geometries can be produced even in small batches. That makes it possible to design how light lands on a surface.</p>
<p>If you want a small accent light on a shelf or softer lighting on a desk, printed shades offer a good alternative.</p>

<h2>The right bulb and heat</h2>
<p>PLA, commonly used in 3D printing, starts to soften above roughly 55-60 °C. Avoid halogen bulbs or high-wattage bulbs that generate a lot of heat inside the lamp. LED bulbs produce less heat and last longer.</p>
<p>Make sure the bulb sits properly in the socket and that airflow is not blocked. Enclosed shades should have small ventilation openings. PETG parts tolerate higher temperatures, but direct contact with the bulb should still be avoided.</p>

<h2>Light diffusion and placement</h2>
<p>A patterned shade turns light into a patterned shadow. To see the effect, place the lamp close to a wall or ceiling. A lamp near a flat surface creates sharper shadows; one placed further away gives a softer result.</p>
<p>In a bedroom, a low-heat warm white LED works well, while a more neutral tone improves readability on a desk. Avoid mixing different colour temperatures in the same room for a more balanced look.</p>

<h2>Material and care</h2>
<p>Because the body is exposed to heat, material choice matters. PLA suits decorative, low-heat use; PETG is preferable where more durability is needed. Remove dust with a soft brush, wipe with a damp cloth and dry completely.</p>
<p>For more on materials, see our <a href="/en/blog/pla-vs-petg-choosing-3d-printing-material">PLA and PETG comparison</a>, and browse lamps and decorative pieces in our <a href="/en/products">collection</a>.</p>

<h2>Cable management and safety</h2>
<p>When choosing a lamp, look beyond appearance: cable management and socket quality matter too. The cable should not be under tension, and the plug and socket should be in good condition. In homes with children, place the lamp on a stable surface and keep the cable out of reach.</p>
<p>Unplug the lamp before cleaning and use a soft, slightly damp cloth. Avoid letting water or detergent reach the electrical parts, and browse our <a href="/en/products">collection</a> for lamps and decorative pieces.</p>

<h2>Conclusion</h2>
<p>With the right bulb and safe placement, 3D printed lamps add both character and function to a room. Planning the light temperature and shadow effect in advance is the easiest way to be happy with the result.</p>`,
      },
    ],
  },
  {
    slug: 'durability-of-3d-printed-products',
    author: 'Hivhestın',
    published: true,
    publishedAt: new Date('2026-11-05T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: '3d-baskili-urunlerin-dayanikliligi',
        title: '3D Baskılı Ürünlerin Dayanıklılığı: Nelere Dikkat Etmeli?',
        excerpt:
          'Malzeme, katman yönü, duvar kalınlığı, ısı ve nem: 3D baskılı bir ürünün ne kadar dayanacağını belirleyen faktörleri ve bakım önerilerini anlatıyoruz.',
        metaTitle: '3D Baskılı Ürünlerin Dayanıklılığı: Nelere Dikkat Etmeli?',
        metaDescription:
          '3D baskılı ürünlerin dayanıklılığını malzeme, katman yönü, duvar kalınlığı, ısı ve nem belirler. Uzun ömür için pratik kontrol ve bakım önerileri.',
        contentHtml: `<p>Bir 3D baskı parçasının ömrü, yalnızca kullanılan filamentin türüne bağlı değildir. Tasarım, baskı yönü, duvar kalınlığı ve kullanım koşulları birlikte belirleyici olur. Aynı malzemeden üretilen iki parçadan biri yıllarca dayanırken diğeri ilk düşüşte kırılabilir.</p>

<h2>Malzeme seçimi</h2>
<p>PLA, sert ve boyut kararlı bir malzemedir; dekoratif parçalarda iyi sonuç verir. Ancak darbeye karşı gevrek olabilir ve ısıyla yumuşar. PETG daha tok bir yapı sunar, darbe altında kırılmak yerine esner. Sürekli kullanılan, taşınan veya nemli ortamda kalan parçalarda PETG genellikle daha uzun ömürlüdür.</p>
<p>Malzemenin yanı sıra filamentin nem almamış olması da önemlidir. Nemli filament, katmanlar arasında zayıf bağ ve yüzeyde gözenek oluşturur. <a href="/tr/blog/pla-mi-petg-mi-3d-baskida-malzeme-secimi">Malzeme karşılaştırmamız</a> seçimi kolaylaştırır.</p>

<h2>Katman yönü ve duvar kalınlığı</h2>
<p>3D baskıda en zayıf nokta genellikle katmanlar arasındaki bağdır. Bir parça, katmanlara dik yönde gelen darbelere karşı daha hassastır. Tasarım sırasında yükün katmanlara paralel dağılmasını sağlamak dayanıklılığı artırır.</p>
<p>İnce duvarlar hafiflik sağlar ancak darbe ve baskı sırasında deformasyona açıktır. Kullanım amacına göre duvar sayısını artırmak, parçayı çok daha sağlam hâle getirir. İç doluluk oranı da doğrudan sertliği etkiler.</p>

<h2>Isı, güneş ve nem</h2>
<p>PLA yaklaşık 55-60 °C üzerinde yumuşamaya başlar. Sıcak araç içi, radyatör üstü veya doğrudan güneş alan bir raf bu sıcaklığa ulaşabilir. PETG daha yüksek sıcaklığa dayanır ancak uzun süreli UV maruziyeti her malzemede renk solmasına yol açabilir.</p>
<p>Nemli alanlarda kullanılan parçaların düzenli kurulanması ve havalandırılması gerekir. Özellikle mutfak ve banyo gibi ortamlarda parçayı doğrudan su temasından korumak ömrü uzatır.</p>

<h2>Kullanım alışkanlıkları</h2>
<ul>
  <li>Ağır parçaları tabanından tutun, ince çıkıntılardan çekmeyin.</li>
  <li>Düşme riski olan yüzeylerde kaymaz bir altlık kullanın.</li>
  <li>Temizlikte aşındırıcı sünger ve çözücü kimyasal kullanmayın.</li>
  <li>Küçük çatlakları erken dönemde onarın.</li>
</ul>

<h2>Bakım ve erken onarım</h2>
<p>Düzenli bakım, küçük hasarların büyümesini engeller. Toz ve nem birikmesi yüzeyde leke bırakabilir; parçayı kuru tutmak ve yumuşak bir bezle silmek yeterlidir. İnce çatlaklar fark edildiğinde erken müdahale etmek, parçanın tamamen kırılmasını önler.</p>
<p>Baskı yönü ve duvar kalınlığı kadar kullanım alışkanlığı da önemlidir. Parçayı doğru noktadan tutmak, aşırı sıkıştırmamak ve doğrudan güneşten korumak ömrü uzatır. <a href="/tr/products">Ürün seçeneklerimizi</a> incelerken kullanım amacınızı göz önünde bulundurun.</p>
<p>Küçük bir onarım seti bulundurmak da pratik bir çözümdür; ancak parçanın yapısını bilmeden güçlü yapıştırıcı kullanmak yüzeye zarar verebilir.</p>

<h2>Sonuç</h2>
<p>Dayanıklılık, malzeme ve tasarımın birlikte doğru kurgulanmasıyla elde edilir. Kullanım yerini baştan netleştirmek, doğru malzemeyi seçmek ve düzenli bakım yapmak bir 3D baskı parçasının ömrünü belirgin biçimde uzatır. <a href="/tr/products">Ürün koleksiyonumuzdaki</a> parçalar, kullanım amacına göre seçilebilir.</p>`,
      },
      {
        locale: 'en',
        slug: 'durability-of-3d-printed-products',
        title: 'Durability of 3D Printed Products: What to Consider',
        excerpt:
          'Material, layer orientation, wall thickness, heat and moisture: the factors that decide how long a 3D printed product lasts, plus care tips.',
        metaTitle: 'Durability of 3D Printed Products: What to Consider',
        metaDescription:
          'Material, layer orientation, wall thickness, heat and moisture determine how long 3D printed products last. Practical checks and care advice.',
        contentHtml: `<p>The life of a 3D printed part does not depend only on the filament type. Design, print orientation, wall thickness and operating conditions all matter. Two parts made from the same material can behave very differently: one lasts for years, the other cracks on its first fall.</p>

<h2>Material choice</h2>
<p>PLA is rigid and dimensionally stable, which works well for decorative parts. It can be brittle under impact and softens with heat. PETG is tougher and flexes instead of shattering. For parts that are handled often, carried around or kept in damp conditions, PETG usually lasts longer.</p>
<p>Filament moisture matters as much as the polymer. Wet filament creates weak inter-layer bonds and porous surfaces. Our <a href="/en/blog/pla-vs-petg-choosing-3d-printing-material">material comparison</a> makes the choice easier.</p>

<h2>Layer orientation and wall thickness</h2>
<p>The weakest point in a 3D print is usually the bond between layers. A part is more sensitive to impacts that arrive perpendicular to the layers. Designing so that loads spread parallel to the layers increases durability.</p>
<p>Thin walls save weight but are more prone to impact damage and deformation during printing. Adding wall lines for the intended use makes a part significantly stronger. Infill also affects stiffness directly.</p>

<h2>Heat, sunlight and moisture</h2>
<p>PLA starts to soften above roughly 55-60 °C. A hot car, a radiator or a shelf in direct sun can reach that temperature. PETG tolerates higher heat, but prolonged UV exposure can fade colour in any material.</p>
<p>Parts used in damp areas need regular drying and ventilation. In kitchens and bathrooms, protecting the piece from direct water contact extends its life.</p>

<h2>Everyday habits</h2>
<ul>
  <li>Lift heavy parts from the base, not by thin protrusions.</li>
  <li>Use a non-slip pad on surfaces where the piece could fall.</li>
  <li>Avoid abrasive sponges and solvent chemicals when cleaning.</li>
  <li>Repair small cracks early.</li>
</ul>

<h2>Maintenance and early repair</h2>
<p>Regular care stops small damage from growing. Dust and moisture can leave marks on the surface; keeping the part dry and wiping it with a soft cloth is enough. When fine cracks appear, acting early prevents the part from breaking completely.</p>
<p>Everyday habits matter as much as layer orientation and wall thickness. Holding the part at the right point, avoiding excessive pressure and keeping it out of direct sun all extend its life. Consider your intended use when browsing our <a href="/en/products">product options</a>.</p>

<h2>Conclusion</h2>
<p>Durability comes from getting material and design right together. Defining the use case early, choosing the correct material and caring for the part regularly noticeably extends the life of a 3D print. Parts in our <a href="/en/products">product collection</a> can be selected for their intended use.</p>`,
      },
    ],
  },
  {
    slug: '3d-printed-decor-small-spaces',
    author: 'Hivhestın',
    published: true,
    publishedAt: new Date('2026-11-06T09:00:00.000Z'),
    translations: [
      {
        locale: 'tr',
        slug: 'kucuk-yasam-alanlari-3d-baski-dekorasyon',
        title: 'Küçük Yaşam Alanları İçin 3D Baskı Dekorasyon',
        excerpt:
          'Küçük evlerde ve stüdyo dairelerde dikey alanı kullanmak, açık renkleri tercih etmek ve çok işlevli 3D baskı parçalarıyla ferah bir görünüm yakalamak.',
        metaTitle: 'Küçük Yaşam Alanları İçin 3D Baskı Dekorasyon',
        metaDescription:
          'Küçük evler için 3D baskı dekorasyon: dikey alan kullanımı, açık renkler, çok işlevli parçalar ve dağınıklığı azaltan pratik yerleşim önerileri.',
        contentHtml: `<p>Küçük bir evde dekorasyon, yalnızca güzel görünmekle ilgili değildir; aynı zamanda alanı verimli kullanmak gerekir. 3D baskı ürünler, özel ölçülerde ve hafif yapıda üretilebildiği için küçük yaşam alanlarında pratik çözümler sunar.</p>

<h2>Dikey alanı kullanın</h2>
<p>Küçük mekânlarda en çok gözden kaçan alan duvarlardır. Raf üstü küçük figürler, duvara monte edilebilen hafif objeler ve asılabilir düzenleyiciler, zemin ve masa yüzeyini boşaltır. 3D baskıda montaj delikleri ve askı detayları tasarıma doğrudan eklenebilir.</p>
<p>Dikey kullanımda parçanın ağırlığını doğru dağıtmak önemlidir. İnce ve uzun parçalar yerine geniş tabanlı ve dengeli formlar seçmek, hem güvenlik hem de görsel denge sağlar.</p>

<h2>Açık renkler ve hafif formlar</h2>
<p>Açık renkler ışığı yansıtarak mekânı olduğundan daha geniş gösterir. Beyaz, krem, açık gri ve pastel tonlar küçük odalarda ferah bir etki yaratır. Koyu renkleri yalnızca tek bir odak noktasında kullanmak, alanı boğmadan kontrast ekler.</p>
<p>İnce hatlı ve şeffaf görünümlü formlar da hacim hissini azaltır. Kafes yapılı veya geometrik desenli 3D baskı parçalar, katı ve ağır objelere göre daha hafif görünür.</p>

<h2>Çok işlevli parçalar</h2>
<p>Küçük evlerde her objenin birden fazla iş yapması idealdir. Kapaklı küçük kutular, hem dekoratif bir obje hem de takı veya kablo saklama alanı olabilir. Stand görevi gören figürler, tableti veya telefonu tutarken dekorasyonu da tamamlar.</p>
<p>Çok işlevli ürün seçerken günlük rutininizi düşünün. Sık kullandığınız eşyaları erişimi kolay yerlere, mevsimlik parçaları daha yüksek raflara yerleştirin.</p>

<h2>Ölçek ve dağınıklık</h2>
<p>Küçük bir alanda birkaç büyük parça, çok sayıda küçük objeden daha düzenli görünür. Aynı temayı paylaşan üç parçalık bir grup, rafı doldurmadan güçlü bir odak oluşturur.</p>
<p>Her yüzeyi doldurmamak gerekir. Boşluk bırakmak, gözün dinlenmesini sağlar ve mekânın daha büyük algılanmasına yardımcı olur. <a href="/tr/blog/ev-dekorasyonunda-3d-baski-figurler">Figür yerleşimi rehberimiz</a> bu dengeyi kurmayı kolaylaştırır.</p>

<h2>Bakım ve seçim</h2>
<p>Küçük alanlarda toz daha görünür olduğu için düzenli temizlik önemlidir. Yumuşak bir fırça ve nemli bez çoğu parça için yeterlidir. <a href="/tr/products">Ürün koleksiyonumuzdan</a> ölçüsü ve rengi mekânınıza uygun parçaları seçebilirsiniz.</p>

<h2>Küçük alanlarda ışık ve renk</h2>
<p>Küçük bir odada aydınlatma, dekorasyon kadar belirleyicidir. Sıcak beyaz bir ışık, açık renkli parçalarla birleştiğinde mekânı daha geniş gösterir. Gölge oluşturan desenli parçaları tek bir duvarda toplamak, dağınık görünümü engeller. <a href="/tr/products">Ürün koleksiyonumuzdaki</a> açık tonlu parçalar, bu dengeyi kurmayı kolaylaştırır.</p>
<p>Mobilya ve dekorasyon arasında boşluk bırakmak, gözün dinlenmesini sağlar. Rafları tamamen doldurmak yerine her rafta bir odak parçası kullanmak, hem düzeni korur hem de parçaların görünürlüğünü artırır.</p>

<h2>Sonuç</h2>
<p>Küçük yaşam alanlarında 3D baskı dekorasyon, doğru ölçek ve işlevsel seçimlerle ferah bir görünüm sağlar. Az sayıda iyi seçilmiş parça, hem yer kazandırır hem de mekâna kişisel bir karakter katar.</p>`,
      },
      {
        locale: 'en',
        slug: '3d-printed-decor-for-small-spaces',
        title: '3D Printed Decor for Small Spaces',
        excerpt:
          'Practical ways to use 3D printed decor in small homes and studios: vertical space, light colours, multifunctional pieces and a calm layout.',
        metaTitle: '3D Printed Decor for Small Spaces',
        metaDescription:
          '3D printed decor for small homes: using vertical space, light colours, multifunctional pieces and practical layout tips to reduce clutter.',
        contentHtml: `<p>Decorating a small home is not only about looking good; it is also about using space efficiently. Because 3D printed products can be made to custom dimensions and in lightweight forms, they offer practical solutions for compact living.</p>

<h2>Use vertical space</h2>
<p>Walls are the most overlooked space in small rooms. Small figures on shelves, lightweight wall-mounted objects and hanging organizers free up floor and table space. Mounting holes and hanging details can be built directly into a 3D printed design.</p>
<p>When using vertical space, distribute weight carefully. Wide-based, balanced shapes are safer and look more stable than thin, tall pieces.</p>

<h2>Light colours and light forms</h2>
<p>Light colours reflect light and make a room feel larger. White, cream, light grey and pastel tones create an airy effect in small rooms. Using dark colours only for a single focal point adds contrast without overwhelming the space.</p>
<p>Fine lines and open forms also reduce visual volume. Lattice or geometric 3D printed pieces look lighter than solid, heavy objects.</p>

<h2>Multifunctional pieces</h2>
<p>In a small home, every object should ideally do more than one job. A small lidded box can be both decor and storage for jewellery or cables. A figure that acts as a stand can hold a tablet or phone while completing the decoration.</p>
<p>When choosing multifunctional products, think about your daily routine. Keep frequently used items within easy reach and move seasonal pieces to higher shelves.</p>

<h2>Scale and clutter</h2>
<p>In a small space, a few larger pieces look tidier than many small objects. A group of three pieces sharing the same theme creates a strong focal point without filling the shelf.</p>
<p>Do not fill every surface. Leaving empty space lets the eye rest and helps the room feel larger. Our <a href="/en/blog/how-to-use-3d-printed-figures-in-home-decor">figure placement guide</a> makes this balance easier to achieve.</p>

<h2>Care and selection</h2>
<p>Dust is more visible in small spaces, so regular cleaning matters. A soft brush and a damp cloth are enough for most pieces. You can choose products that fit your space in terms of size and colour from our <a href="/en/products">collection</a>.</p>

<h2>Light and colour in small rooms</h2>
<p>In a small room, lighting is as important as decoration. Warm white light combined with light-coloured pieces makes the space feel larger. Grouping patterned pieces that cast shadows on a single wall prevents a scattered look. Light-toned products in our <a href="/en/products">collection</a> make this balance easier.</p>
<p>Leaving space between furniture and decor lets the eye rest. Instead of filling every shelf, use one focal piece per shelf to keep the room organised and make each object more visible.</p>

<h2>Conclusion</h2>
<p>With the right scale and functional choices, 3D printed decor brings an airy feel to small living spaces. A few well-chosen pieces both save room and add a personal character.</p>`,
      },
    ],
  },
]

async function main() {
  for (const [index, seed] of posts.entries()) {
    const coverTitle =
      seed.translations.find((translation) => translation.locale === 'en')?.title || seed.slug
    const coverImage = await writeBlogCover(seed.slug, coverTitle, index + 3)

    const post = await prisma.blogPost.upsert({
      where: { slug: seed.slug },
      update: {
        author: seed.author,
        coverImage,
        published: seed.published,
        publishedAt: seed.publishedAt,
      },
      create: {
        slug: seed.slug,
        author: seed.author,
        coverImage,
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

  console.log(`Ek blog seed tamamlandı: ${posts.length} yazı`)
}

main()
  .catch((error) => {
    console.error('Ek blog seed hatası:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

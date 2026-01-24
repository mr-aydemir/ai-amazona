

# ARAS KARGO SEVKİYAT ENTEGRASYONU WEB SERVİS DÖKÜMANI

## 1. Genel Bilgiler ve Tanımlar

**Tanım:** Aras Kargo Kurumsal Müşterilerinin online olarak kargo bilgilerini gönderebildiği, geri dönüş olarak onay ya da hata mesajı sağlayan web servisidir.

**Önemli Notlar:**

* **SetOrder** metodu ile gönderilen veriler, Aras Kargo şubesi tarafından irsaliye kaydı oluşturulduğu anda Kargo Takip Numarası oluşmaktadır.


* Kargo takip numaralarının sorgulanması için farklı bir servis kullanılmaktadır ([https://esasweb.araskargo.com.tr/](https://esasweb.araskargo.com.tr/)).



### Servis Linkleri ve Erişim Bilgileri

**Test Ortamı:**

* **Link:** `https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx` 


* **Kullanıcı Adı (UserName):** neodyum 


* **Şifre (Password):** nd2580 



**Canlı Ortam:**

* **Link:** `https://customerws.araskargo.com.tr/arascargoservice.asmx` 


* **Not:** Canlı ortam bilgileri, testler tamamlandıktan sonra Aras Kargo yetkilisi tarafından paylaşılmaktadır.



**Kullanılabilir Metotlar:**

1. SetOrder
2. GetOrder
3. GetOrderWithIntegrationCode
4. Cancel Dispatch 



---

## 2. SetOrder Metodu

**Kullanım Amacı:** Kargonun alıcısına ait bilgilerin gönderildiği, varış merkezi belirleme ve şube tarafında irsaliye kaydı oluşturma işlemleri için kullanılan metottur.

### Servis Parametreleri

Servise ait giriş parametreleri aşağıdaki gibidir:

| İsim | Tipi | Açıklama | Zorunlu Mu? |
| --- | --- | --- | --- |
| **UserName** | String | Web Servis Kullanıcı Adınız | Evet |
| **Password** | String | Web Servis Kullanıcı Şifreniz | Evet |
| **TradingWaybillNumber** | String(16) | Sevk İrsaliye No. | Evet |
| **InvoiceNumber** | String(20) | Fatura No | Hayır |
| **IntegrationCode** | String(32) | Sipariş Kodu/Entegrasyon Kodu | Evet |
| **ReceiverName** | String(100) | Alıcı Adı | Evet |
| **ReceiverAddress** | String(250) | Alıcı Adresi (String şeklinde toplu adres) | Evet |
| **ReceiverPhone1** | String(10) | Telefon-1 | Evet |
| **ReceiverPhone2** | String(10) | Telefon-2 | Hayır |
| **ReceiverPhone3** | String(10) | GSM No | Hayır |
| **ReceiverCityName** | String(40) | İl-Şehir Adı | Evet |
| **ReceiverTownName** | String(16) | İlçe Adı | Evet |
| **VolumetricWeight** | Double(9,3) | Ürün desi | Hayır |
| **Weight** | Double(9,3) | Ürün kg | Hayır |
| **PieceCount** | Integer(2) | Sevk edilen kargoya ait paket/koli sayısı | Hayır (Detay iletiliyorsa Zorunlu) |
| **SpecialField1** | String(200) | Özel Alan - 1 | Hayır |
| **SpecialField2** | String(100) | Özel Alan - 2 | Hayır |
| **SpecialField3** | String(100) | Özel Alan - 3 | Hayır |
| **IsCod** | String(1) | Tahsilatlı Kargo gönderisi (0=Hayır, 1=Evet) | Hayır (Tahsilatlı ise Zorunlu) |
| **CodAmount** | Double(18,2) | Tahsilatlı Teslimat ürünü tutar bilgisi | Hayır |
| **CodCollectionType** | String(1) | Tahsilatlı ürün ödeme tipi (0=Nakit, 1=Kredi Kartı) | Hayır |
| **CodBillingType** | String(1) | Hizmet bedeli gönderi içinde mi (0 gönderilmeli) | Hayır (Sabit "0") |
| **Description** | String(255) | Açıklama | Hayır |
| **TaxNumber** | String(15) | Vergi No | Hayır |
| **TaxOffice** | Long(8) | Vergi dairesi | Hayır |
| **PrivilegeOrder** | String(20) | Varış merkezi belirleme Öncelik sırası | Hayır |
| **CityCode** | String(32) | İl Kodu | Hayır |
| **TownCode** | String(32) | İlçe Kodu | Hayır |
| **ReceiverDistrictName** | String(64) | Semt | Hayır |
| **ReceiverQuarterName** | String(64) | Mahalle | Hayır |
| **ReceiverAvenueName** | String(64) | Cadde | Hayır |
| **ReceiverStreetName** | String(64) | Sokak | Hayır |
| **PayorTypeCode** | Integer(1) | Ödemeyi kimin yapacağı (1=Gönderici, 2=Alıcı). Boş gelirse 1 atanır. | Evet |
| **IsWorldWide** | Integer(1) | Yurtdışı gönderisi mi (0=Yurtiçi, 1=Yurtdışı) | Evet |
| **PieceDetails** | List | Kargoya ait paket/koli detay listesi | Hayır |

### PieceDetail Nesnesi (Koli Detayları)

Koli detaylarının gönderilmesi ve barkod işlemleri için kullanılan nesnedir.

| İsim | Tipi | Açıklama | Zorunlu Mu? |
| --- | --- | --- | --- |
| **VolumetricWeight** | String(6) | Kargonun ilgili parçasının hacim bilgisi | Hayır |
| **Weight** | String(6) | Kargonun ilgili parçasının kg bilgisi | Hayır |
| **BarcodeNumber** | String(64) | Kargonun ilgili parçasının barkod numarası | Evet |
| **ProductNumber** | String(32) | İlgili Parçanın ürün kodu | Hayır |
| **Description** | String(64) | Kargoya ait açıklama bilgisi | Hayır |
| 

 |  |  |  |

### SetOrder Geri Dönüş Kodları

Servise ait dönüş kodları ve anlamları:

| Kod | Açıklama |
| --- | --- |
| **0** | Başarılı |
| **934** | Alıcı Adı En Fazla 100 Karakter Uzunluğunda Olmalıdır. |
| **935** | IntegrationCode alanı boş olamaz veya uzunluk hatası (2-32 karakter). |
| **935** | Bir siparişe ait bilgiler en fazla 20 kez gönderilebilir. |
| **935** | ReceiverPhone1 alanı zorunludur veya sadece sayılardan oluşmalıdır. |
| **936** | Alıcı Adresi/Adı girilmeli veya Argo kelime içermemelidir. |
| **936** | Şehir/İlçe adı girilmeli (Maks 32 karakter). |
| **936** | PayorTypeCode sadece 1 veya 2 olabilir. IsCod sadece 0 veya 1 olabilir. |
| **936** | CodCollectionType sadece 0 veya 1 olabilir. |
| **936** | Alıcı Ödemeli Tahsilatlı Kargo Gönderisi Yapılamamaktadır. |
| **1000/1002** | Kullanıcı Adı ve Şifre yanlış / Entegrasyon bilgi hatası. |
| **1003** | Aras Şube Bilgisi Tanımlı Değil. |
| **1006** | Sevk adresi bulunamadı / Aktif değil. |
| **5000-5007** | Bir hata oluştu. |
| **5008** | Kayıt Yapılamadı. |
| **60020** | En az bir adet sipariş bilgisi göndermeniz gerekmektedir. |
| **60022/70027** | İrsaliyesi kesildiği için bilgiler güncellenemez. |
| **70018** | ReceiverAddress en fazla 250 karakter olabilir. |
| **70021** | Koli sayısı 0'dan büyük olmalı / Toplam parça sayısı gönderilmeli. |
| **70022** | Parça bilgilerinde barcode bilgisi eksik. |
| **70026** | Volume değeri decimal olmalı / Barkod daha önce gönderilmiş. |
| **70026** | CodAmount değeri 5 ile 5000 TL arasında olmalıdır. |
| **70028** | Parçaların barkod numaraları aynı olamaz. |
| **70121** | TradingWaybillNumber 16 karakterden fazla olamaz. |

### Örnek Kod (C#)

```csharp
Service arasCargoService = new Service();
Order[] orderInfos = new Order[1];
Order orderInfo = new Order();

orderInfo.UserName = "neodyum";
orderInfo.Password = "nd2580";
orderInfo.IntegrationCode = "665544333245676";
orderInfo.TradingWaybillNumber = "C164436";
orderInfo.InvoiceNumber = "FC164436";
orderInfo.ReceiverName = "Test";
orderInfo.ReceiverAddress = "Rüzgarlıbahçe Mahallesi Yavuzsultanselim Caddesi No:2 Aras Plaza Kavacık/İstanbul";
orderInfo.ReceiverPhone1 = "02165385562";
orderInfo.ReceiverCityName = "İSTANBUL";
orderInfo.ReceiverTownName = "BEYKOZ";
orderInfo.PieceCount = "2";

// Parça Detayları
orderInfo.PieceDetails = new PieceDetail[2];

// 1. Parça
PieceDetail pieceDetail = new PieceDetail();
pieceDetail.BarcodeNumber = "34567890";
pieceDetail.ProductNumber = "";
pieceDetail.Description = "Test";
pieceDetail.Weight = "1";
pieceDetail.VolumetricWeight = "1";
orderInfo.PieceDetails[0] = pieceDetail;

// 2. Parça
PieceDetail pieceDetail2 = new PieceDetail();
pieceDetail2.BarcodeNumber = "234567887654323456";
pieceDetail2.Description = "Test";
pieceDetail2.Weight = "1";
pieceDetail2.VolumetricWeight = "1";
orderInfo.PieceDetails[1] = pieceDetail2;

// Servis Çağrısı
orderInfos[0] = orderInfo;
arasCargoService.Timeout = 999999999;
OrderResultInfo[] dispatchResultInfoArray = arasCargoService.SetOrder(orderInfos, orderInfo.UserName, orderInfo.Password);

```



### Örnek XML

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <SetOrder xmlns="http://tempuri.org/">
      <orderInfo>
        <Order>
          <UserName>neodyum</UserName>
          <Password>nd2580</Password>
          <TradingWaybillNumber>9423012</TradingWaybillNumber>
          <InvoiceNumber>6902001888</InvoiceNumber>
          <ReceiverName>NEDİM DEMİRCİ</ReceiverName>
          <ReceiverAddress>xxxxx CAD. yyyyy SOK. NO:7</ReceiverAddress>
          <ReceiverPhone1>02121111111</ReceiverPhone1>
          <ReceiverCityName>İSTANBUL</ReceiverCityName>
          <ReceiverTownName>GAZİOSMANPAŞA</ReceiverTownName>
          <VolumetricWeight>1</VolumetricWeight>
          <PieceCount>1</PieceCount>
          <IntegrationCode>6154197713</IntegrationCode>
          <PayorTypeCode>1</PayorTypeCode>
          <PieceDetails>
            <PieceDetail>
              <VolumetricWeight>3</VolumetricWeight>
              <Weight>2</Weight>
              <BarcodeNumber>79792027121</BarcodeNumber>
              <ProductNumber />
              <Description />
            </PieceDetail>
          </PieceDetails>
          <SenderAccountAddressId />
        </Order>
      </orderInfo>
      <userName>neodyum</userName>
      <password>nd2580</password>
    </SetOrder>
  </soap:Body>
</soap:Envelope>

```



---

## 3. GetOrder ve GetOrderWithIntegrationCode Metotları

**Tanım:** SetOrder metodu ile gönderilen dataların kontrolü için kullanılır. Tarih veya Entegrasyon kodu ile sorgulama yapılabilir.

**Test Ortamı Linkleri:**

* **Tarih Bazlı (GetOrder):** `https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx?op=GetOrder` 

* **Entegrasyon Kodu Bazlı:** `https://customerservicestest.araskargo.com.tr/arascargoservice/arascargoservice.asmx?op=GetOrderWithIntegrationCode` 



**Canlı Ortam Linkleri:**

* **Tarih Bazlı (GetOrder):** `https://customerws.araskargo.com.tr/arascargoservice.asmx?op=GetOrder` 

* **Entegrasyon Kodu Bazlı:** `https://customerws.araskargo.com.tr/arascargoservice.asmx?op=GetOrderWithIntegrationCode` 



---

## 4. CancelDispatch Metodu

**Tanım:** SetOrder metodu ile gönderilen dataların silinmesi için kullanılır.

**Linkler:**

* **Canlı Ortam:** `https://customerws.araskargo.com.tr/arascargoservice.asmx?op=CancelDispatch` 



**CancelDispatch Geri Dönüş Kodları:**

| Kod | Açıklama |
| --- | --- |
| **0** | Başarılı |
| **1** | [Sipariş Kodu] + "Başarılı bir şekilde silindi." |
| **999** | İrsaliyesi Kesilmiş Sipariş İptal Edilemez. |
| **936** | Hata oluştu |
| **-1** | Kayıt bulunamadı |
| **-2** | Kullanıcı adı ve Şifreniz hatalıdır. |
| 

 |  |


## Entegrasyon Kodu Bazlı Örnek:
### HTTP GET
The following is a sample HTTP GET request and response. The placeholders shown need to be replaced with actual values.

GET /arascargoservice/arascargoservice.asmx/GetOrderWithIntegrationCode?userName=string&password=string&integrationCode=string HTTP/1.1
Host: customerservicestest.araskargo.com.tr
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length
```xml
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfOrder xmlns="http://tempuri.org/">
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
</ArrayOfOrder>
```
###  HTTP POST
The following is a sample HTTP POST request and response. The placeholders shown need to be replaced with actual values.

POST /arascargoservice/arascargoservice.asmx/GetOrderWithIntegrationCode HTTP/1.1
Host: customerservicestest.araskargo.com.tr
Content-Type: application/x-www-form-urlencoded
Content-Length: length

userName=string&password=string&integrationCode=string
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length

```xml
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfOrder xmlns="http://tempuri.org/">
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
</ArrayOfOrder>
```


### HTTP GET
The following is a sample HTTP GET request and response. The placeholders shown need to be replaced with actual values.

GET /arascargoservice/arascargoservice.asmx/GetOrder?userName=string&password=string&Date=string HTTP/1.1
Host: customerservicestest.araskargo.com.tr
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length

```xml
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfOrder xmlns="http://tempuri.org/">
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
</ArrayOfOrder>
```
### HTTP POST
The following is a sample HTTP POST request and response. The placeholders shown need to be replaced with actual values.

POST /arascargoservice/arascargoservice.asmx/GetOrder HTTP/1.1
Host: customerservicestest.araskargo.com.tr
Content-Type: application/x-www-form-urlencoded
Content-Length: length

userName=string&password=string&Date=string
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length

```xml
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfOrder xmlns="http://tempuri.org/">
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
  <Order>
    <UserName>string</UserName>
    <Password>string</Password>
    <TradingWaybillNumber>string</TradingWaybillNumber>
    <InvoiceNumber>string</InvoiceNumber>
    <ReceiverName>string</ReceiverName>
    <ReceiverAddress>string</ReceiverAddress>
    <ReceiverPhone1>string</ReceiverPhone1>
    <ReceiverPhone2>string</ReceiverPhone2>
    <ReceiverPhone3>string</ReceiverPhone3>
    <ReceiverCityName>string</ReceiverCityName>
    <ReceiverTownName>string</ReceiverTownName>
    <VolumetricWeight>string</VolumetricWeight>
    <Weight>string</Weight>
    <PieceCount>string</PieceCount>
    <SpecialField1>string</SpecialField1>
    <SpecialField2>string</SpecialField2>
    <SpecialField3>string</SpecialField3>
    <CodAmount>string</CodAmount>
    <CodCollectionType>string</CodCollectionType>
    <CodBillingType>string</CodBillingType>
    <IntegrationCode>string</IntegrationCode>
    <Description>string</Description>
    <TaxNumber>string</TaxNumber>
    <TtDocumentId>string</TtDocumentId>
    <TaxOffice>string</TaxOffice>
    <PrivilegeOrder>string</PrivilegeOrder>
    <Country>string</Country>
    <CountryCode>string</CountryCode>
    <CityCode>string</CityCode>
    <TownCode>string</TownCode>
    <ReceiverDistrictName>string</ReceiverDistrictName>
    <ReceiverQuarterName>string</ReceiverQuarterName>
    <ReceiverAvenueName>string</ReceiverAvenueName>
    <ReceiverStreetName>string</ReceiverStreetName>
    <PayorTypeCode>string</PayorTypeCode>
    <IsWorldWide>string</IsWorldWide>
    <IsCod>string</IsCod>
    <UnitID>string</UnitID>
    <PieceDetails>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
      <PieceDetail>
        <VolumetricWeight>string</VolumetricWeight>
        <Weight>string</Weight>
        <BarcodeNumber>string</BarcodeNumber>
        <ProductNumber>string</ProductNumber>
        <Description>string</Description>
      </PieceDetail>
    </PieceDetails>
    <SenderAccountAddressId>string</SenderAccountAddressId>
  </Order>
</ArrayOfOrder>```


## 4. CancelDispatch Metodu
HTTP GET
The following is a sample HTTP GET request and response. The placeholders shown need to be replaced with actual values.

GET /arascargoservice.asmx/CancelDispatch?userName=string&password=string&integrationCode=string HTTP/1.1
Host: customerws.araskargo.com.tr
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length

```xml
<?xml version="1.0" encoding="utf-8"?>
<DispatchResultInfo xmlns="http://tempuri.org/">
  <ResultCode>string</ResultCode>
  <ResultMessage>string</ResultMessage>
  <CargoKey>string</CargoKey>
</DispatchResultInfo>
```

### HTTP POST
The following is a sample HTTP POST request and response. The placeholders shown need to be replaced with actual values.

POST /arascargoservice.asmx/CancelDispatch HTTP/1.1
Host: customerws.araskargo.com.tr
Content-Type: application/x-www-form-urlencoded
Content-Length: length

userName=string&password=string&integrationCode=string
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
Content-Length: length

```xml
<?xml version="1.0" encoding="utf-8"?>
<DispatchResultInfo xmlns="http://tempuri.org/">
  <ResultCode>string</ResultCode>
  <ResultMessage>string</ResultMessage>
  <CargoKey>string</CargoKey>
</DispatchResultInfo>
```
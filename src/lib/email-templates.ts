export interface EmailTemplateProps {
  resetUrl: string
  userEmail: string
}

export const passwordResetTemplate = ({ resetUrl, userEmail }: EmailTemplateProps): string => {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Şifre Sıfırlama - Hivhestın</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            🔐 Şifre Sıfırlama
          </h1>
          <p style="color: #e8f0fe; margin: 10px 0 0 0; font-size: 16px;">
            Hivhestın hesabınız için şifre sıfırlama talebi
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="color: #333333; font-size: 18px; margin: 0 0 10px 0; line-height: 1.5;">
              Merhaba,
            </p>
            <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.6;">
              <strong>${userEmail}</strong> hesabınız için şifre sıfırlama talebi aldık.
            </p>
          </div>

          <!-- Reset Button -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 12px; border: 2px dashed #e9ecef;">
              <p style="color: #495057; margin: 0 0 25px 0; font-size: 16px;">
                Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
              </p>
              <a href="${resetUrl}" 
                 style="display: inline-block; 
                        background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                        color: #ffffff; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
                        transition: all 0.3s ease;">
                🔑 Şifremi Sıfırla
              </a>
            </div>
          </div>

          <!-- Security Info -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <div style="display: flex; align-items: flex-start;">
              <div style="margin-right: 15px; font-size: 20px;">⚠️</div>
              <div>
                <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">Güvenlik Uyarısı</h3>
                <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5;">
                  <li>Bu talebi siz yapmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.</li>
                  <li>Bu bağlantı güvenlik nedeniyle <strong>1 saat</strong> sonra geçersiz olacaktır.</li>
                  <li>Şifrenizi kimseyle paylaşmayın.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Alternative Link -->
          <div style="border-top: 2px solid #e9ecef; padding-top: 25px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 15px 0; text-align: center;">
              Buton çalışmıyorsa, aşağıdaki bağlantıyı kopyalayıp tarayıcınıza yapıştırın:
            </p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
              <a href="${resetUrl}" 
                 style="color: #007bff; 
                        word-break: break-all; 
                        text-decoration: none; 
                        font-size: 13px; 
                        font-family: monospace;">
                ${resetUrl}
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #343a40; padding: 30px 20px; text-align: center;">
          <div style="margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
              Hivhestın
            </h2>
            <p style="color: #adb5bd; margin: 5px 0 0 0; font-size: 14px;">
              Güvenilir E-Ticaret Platformu
            </p>
          </div>
          
          <div style="border-top: 1px solid #495057; padding-top: 20px;">
            <p style="color: #6c757d; margin: 0; font-size: 12px;">
              © 2025 Hivhestın. Tüm hakları saklıdır.
            </p>
            <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 12px;">
              Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export const passwordResetSuccessTemplate = (userEmail: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Şifre Başarıyla Değiştirildi - Hivhestın</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            ✅ Şifre Değiştirildi
          </h1>
          <p style="color: #e8f5e8; margin: 10px 0 0 0; font-size: 16px;">
            Şifreniz başarıyla güncellendi
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; text-align: center;">
          <div style="margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
            <h2 style="color: #28a745; margin: 0 0 15px 0; font-size: 24px;">
              Başarılı!
            </h2>
            <p style="color: #333333; font-size: 18px; margin: 0 0 10px 0;">
              <strong>${userEmail}</strong> hesabınızın şifresi başarıyla değiştirildi.
            </p>
            <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.6;">
              Artık yeni şifrenizle giriş yapabilirsiniz.
            </p>
          </div>

          <!-- Security Notice -->
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 25px; margin: 30px 0;">
            <div style="margin-bottom: 15px; font-size: 24px;">🔒</div>
            <h3 style="color: #0c5460; margin: 0 0 15px 0; font-size: 18px;">Güvenlik Bildirimi</h3>
            <p style="color: #0c5460; margin: 0; font-size: 15px; line-height: 1.6;">
              Bu değişikliği siz yapmadıysanız, lütfen derhal bizimle iletişime geçin ve hesabınızı güvence altına alın.
            </p>
          </div>

          <!-- Login Button -->
          <div style="margin: 40px 0;">
            <a href="${process.env.NEXTAUTH_URL}/auth/signin" 
               style="display: inline-block; 
                      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                      color: #ffffff; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);">
              🚀 Giriş Yap
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #343a40; padding: 30px 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0 0 5px 0; font-size: 24px; font-weight: bold;">
            Hivhestın
          </h2>
          <p style="color: #adb5bd; margin: 0 0 20px 0; font-size: 14px;">
            Güvenilir E-Ticaret Platformu
          </p>
          <p style="color: #6c757d; margin: 0; font-size: 12px;">
            © 2025 Hivhestın. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export interface OrderReceivedTemplateProps {
  orderId: string
  userName?: string | null
  total?: number
  orderDate?: string
  items?: { name: string; quantity: number; price: number }[]
}

export const orderReceivedTemplate = ({ orderId, userName, total, orderDate, items = [] }: OrderReceivedTemplateProps): string => {
  const baseUrl = process.env.NEXTAUTH_URL || ''
  const orderUrl = `${baseUrl}/order-confirmation/${orderId}`
  const formattedTotal = typeof total === 'number' ? `₺${total.toFixed(2)}` : ''
  const formattedDate = orderDate ? new Date(orderDate).toLocaleString('tr-TR') : ''

  const itemsHtml = items.length > 0
    ? `
      <div style="margin-top: 20px;">
        <h3 style="color: #333333; margin: 0 0 10px 0; font-size: 18px;">Sipariş Özeti</h3>
        <div style="border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
          ${items.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f1f3f5;">
              <div style="color: #212529;">${item.name}</div>
              <div style="color: #495057;">${item.quantity} × ₺${item.price.toFixed(2)}</div>
            </div>
          `).join('')}
          <div style="padding: 12px 16px; background-color: #f8f9fa; display: flex; justify-content: space-between;">
            <strong>Toplam</strong>
            <strong>${formattedTotal}</strong>
          </div>
        </div>
      </div>
    `
    : ''

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Siparişiniz Alındı - Hivhestın</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">
            ✅ Siparişiniz Alındı
          </h1>
          <p style="color: #e8f0fe; margin: 10px 0 0 0; font-size: 15px;">
            Teşekkürler ${userName ? (userName as string) : ''}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333333; font-size: 16px; margin: 0 0 10px 0; line-height: 1.6;">
            Siparişiniz alınmıştır. Kargoya verildiğinde e-posta ve site üzerinden bilgilendirileceksiniz.
          </p>
          <div style="margin-top: 8px; color: #6c757d; font-size: 14px;">
            <div>Sipariş No: <strong>#${orderId}</strong></div>
            ${formattedDate ? `<div>Tarih: <strong>${formattedDate}</strong></div>` : ''}
            ${formattedTotal ? `<div>Tutar: <strong>${formattedTotal}</strong></div>` : ''}
          </div>

          ${itemsHtml}

          <!-- CTA -->
          <div style="text-align: center; margin: 24px 0 8px;">
            <a href="${orderUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.25);">
              Siparişi Görüntüle
            </a>
          </div>

          <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px;">
            <div style="display: flex; align-items: flex-start;">
              <div style="margin-right: 12px; font-size: 18px;">🚚</div>
              <div style="color: #495057; font-size: 14px; line-height: 1.6;">
                Siparişiniz kargoya verildiğinde size ayrıca bilgilendirme yapılacaktır.
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #343a40; padding: 24px 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0 0 5px 0; font-size: 20px; font-weight: bold;">Hivhestın</h2>
          <p style="color: #adb5bd; margin: 0 0 10px 0; font-size: 13px;">Güvenilir E-Ticaret Platformu</p>
          <p style="color: #6c757d; margin: 0; font-size: 12px;">© 2025 Hivhestın. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
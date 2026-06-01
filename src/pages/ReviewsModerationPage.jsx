import { toText } from '../helpers'

export function ReviewsModerationPage({ reviews, reports, busyKeys, onAccept, onReject, onDelete }) {
  return (
    <div className="page-stack">
      <section className="panel-card review-moderation-list">
        {busyKeys.reviewDisputes ? (
          <div className="empty-panel">Загружаем спорные отзывы...</div>
        ) : reviews.length === 0 ? (
          <div className="empty-panel">Спорных отзывов нет.</div>
        ) : (
          reviews.map((review) => {
            const reviewId = toText(review?.id)
            const dispute = review?.dispute || {}

            return (
              <article key={reviewId} className="review-moderation-card">
                <div className="review-moderation-card__head">
                  <div>
                    <strong>Товар {toText(review?.product_id ?? review?.productId)}</strong>
                    <span>{toText(review?.author_name ?? review?.authorName) || 'Покупатель'} · оценка {toText(review?.rating)}</span>
                  </div>
                  <span className="status-pill">на проверке</span>
                </div>

                <p>{toText(review?.comment)}</p>

                <div className="inline-note">
                  <strong>Причина продавца</strong>
                  <span>{toText(dispute.reason) || 'Несправедливый отзыв'}</span>
                </div>

                <div className="review-moderation-actions">
                  <button className="button button-primary" type="button" onClick={() => onAccept(review)} disabled={busyKeys[`reviewResolve-${reviewId}`]}>
                    Исключить из рейтинга
                  </button>
                  <button className="button button-secondary" type="button" onClick={() => onReject(review)} disabled={busyKeys[`reviewResolve-${reviewId}`]}>
                    Отклонить спор
                  </button>
                  <button className="button button-ghost" type="button" onClick={() => onDelete(reviewId)} disabled={busyKeys[`reviewDelete-${reviewId}`]}>
                    Удалить отзыв
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

      <section className="panel-card review-moderation-list">
        <div className="section-head">
          <div>
            <h2>Жалобы покупателей</h2>
          </div>
        </div>

        {busyKeys.reviewReports ? (
          <div className="empty-panel">Загружаем жалобы...</div>
        ) : reports.length === 0 ? (
          <div className="empty-panel">Жалоб на отзывы нет.</div>
        ) : (
          reports.map((item) => {
            const review = item.review || {}
            const report = item.report || {}
            const reviewId = toText(review?.id)

            return (
              <article key={`${reviewId}-${toText(report?.id)}`} className="review-moderation-card">
                <div className="review-moderation-card__head">
                  <div>
                    <strong>Товар {toText(review?.product_id ?? review?.productId)}</strong>
                    <span>{toText(review?.author_name ?? review?.authorName) || 'Покупатель'} · жалоба: {formatReportReason(report.reason)}</span>
                  </div>
                  <span className="status-pill">жалоба</span>
                </div>
                <p>{toText(review?.comment)}</p>
                <div className="inline-note">
                  <strong>Комментарий жалобы</strong>
                  <span>{toText(report.details) || 'Без подробностей'}</span>
                </div>
                <div className="review-moderation-actions">
                  <button className="button button-ghost" type="button" onClick={() => onDelete(reviewId)} disabled={busyKeys[`reviewDelete-${reviewId}`]}>
                    Удалить отзыв
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}

function formatReportReason(reason) {
  if (reason === 'content') {
    return 'неприемлемое содержание'
  }
  if (reason === 'media') {
    return 'фото или видео'
  }
  if (reason === 'spam') {
    return 'спам или реклама'
  }

  return 'другая причина'
}

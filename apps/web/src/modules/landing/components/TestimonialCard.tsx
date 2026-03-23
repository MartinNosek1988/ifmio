interface Props {
  client: string
  resultHeadline: string
  quote: string
  name: string
  role: string
}

export function TestimonialCard({ client, resultHeadline, quote, name, role }: Props) {
  return (
    <article className="testimonial-card" role="group" aria-roledescription="slide">
      <p className="testimonial-card__result">{resultHeadline}</p>
      <blockquote className="testimonial-card__quote">&ldquo;{quote}&rdquo;</blockquote>
      <div className="testimonial-card__author">
        <div className="testimonial-card__avatar" aria-hidden="true">
          {name.charAt(0)}
        </div>
        <div>
          <div className="testimonial-card__name">{name}</div>
          <div className="testimonial-card__role">{role}, {client}</div>
        </div>
      </div>
    </article>
  )
}

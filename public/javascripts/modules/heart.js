import axios from 'axios'
import { $ } from './bling'

function getHeart(e) {
  e.preventDefault()
  axios
    .post(this.action) //clicked form
    .then(res => {
      // this.heart -> input name="heart"
      const isHearted = this.heart.classList.toggle('heart__button--hearted')
      $('.heart-count').textContent = res.data.hearts.length
      if (isHearted) {
        this.heart.classList.add('heart__button--float')
        setTimeout(
          () => this.heart.classList.remove('heart__button--float'),
          2500
        )
      }
    })
    .catch(console.err)
}

export default getHeart

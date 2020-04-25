import '../sass/style.scss'

import { $, $$ } from './modules/bling'
import autocomplete from './modules/autoComplete'
import typeAhead from './modules/typeAhead'
import makeMap from './modules/map'
import getHeart from './modules/heart'

autocomplete($('#address'), $('#lat'), $('#lng'))

typeAhead($('.search'))

makeMap($('#map'))

const heartForms = $$('form.heart')
heartForms.on('submit', getHeart)

import 'babel-polyfill'
import Dog from './dog'

/* eslint-disable no-console */

console.log('Hello world')

const toby = new Dog('Toby')

console.log(toby.bark())

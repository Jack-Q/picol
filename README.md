# Picol 

![Picol-Text](./picol-text.png)

  [![Build Status](https://travis-ci.org/Jack-Q/picol.svg?branch=master)](https://travis-ci.org/Jack-Q/picol) 
  [![Dependency Status](https://david-dm.org/Jack-Q/picol.svg)](https://david-dm.org/Jack-Q/picol)
  
  [>> View Picol Online](https://git.io/picol)

## Picol as Pico-Language

> 1 Pico-L is 10<sup>-12</sup>L, a tiny volume that can hold only a small neuron.

In this project, a minimal C-like language is to be implemented for demonstrative purpose.
Since the language is so trivial that it is inadequate for any real world application,
this language is named as PicoL(Pico-Language, where "pico-" is 10<sup>-12</sup>).


## Picol as Pictorial Illustrated Compiler Organization by Layer

> Pico Playground for Picol

Pictorial Illustrated Compiler Organization by Layer is a serials of interactive 
applications that illustrates the construction of a simple compiler 
(of the PicoL).

## Usage
 
```
# compile and execute core CLI
npm run core "src-file.picol"

# watching code changes for core module
npm run dev:core

# watching code changes for UI module
npm run dev

# build UI module
npm run build

```

## Road map
Currently, this project is still in progress. Some of unimplemented features are listed below.

* Core Module (PicoL)
  * [ ] Language specification
  * [ ] Quadruple generator static type checking
  * [ ] Executor dynamic type checking
  * [ ] Reference to array implementation
  * [ ] Symbol management for nested context
  * [ ] More complete CLI
* UI (PICOL)
  * [ ] Local file as source and target
  * [ ] Blocking build-in function for executor
  * [ ] Memory view for sparse array in JavaScript
  * [ ] Mobile screen adaption

## License

Picol is licensed under MIT License. Copyright &copy; 2017 Jack Q

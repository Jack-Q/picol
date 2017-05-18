#!/bin/bash

LATEXMK_OPT="-pdf -xelatex -shell-escape -8bit -f"
DOCUMENT="spec"

if [ ! -f './rail/rail' ]; then 
  # Compile the rail utility
  make -sC ./rail

  if [ ! $? -eq 0 ]; then
    echo failed to compile rail
    echo please ensure thet both flex and bison are presented
    exit 1
  fi
fi


# make page
latexmk $LATEXMK_OPT $DOCUMENT

# transfrom the rail spec
./rail/rail $DOCUMENT 2>/dev/null 1>/dev/null

if [ ! $? -eq 0 ]; then 
  echo 'rail utility executiion filed, which is generally caused by the syntax error within the rail section'
  exit 1
fi

rm $DOCUMENT.pdf
latexmk $LATEXMK_OPT $DOCUMENT
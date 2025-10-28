/**
 * @file Tree-sitter grammar for Mim, the front-end language of MimIR
 * @author Manuel Lata <contact@mlata.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PUNCTUATION = [
  "(", ")", "[", "]", "{", "}",
  "‹", "›", "«", "»", "<<", ">>", "<", ">",
  "=", ",", ";", ".", "#", ":", "%", "@",
]

module.exports = grammar({
  name: "mim",

  word: $ => $._symbol,

  extras: ($) => [
    /\s/,
    $.line_comment,
    $.doc_comment,
    $.block_comment,
  ],

  supertypes: $ => [
    $._dependency,
    $._declaration,
  ],

  rules: {
    source_file: $ => seq(
      repeat($._dependency),
      repeat($._declaration),
    ),

    _dependency: $ => choice(
      $.import,
      $.plugin,
    ),

    import: $ => seq("import", $.identifier, ";"),

    plugin: $ => seq("plugin", $.identifier, ";"),

    _declaration: $ => choice(
      $.let,
      $.lam,
      $.con,
      $.fun,
      $.sigma,
      $.axiom,
    ),

    let: $ => prec(4, seq(
      "let",
      choice($._pattern, $.annex),
      "=",
      field("value", $._expression),
      ";",
    )),

    lam: $ => seq(
      "lam",
      field("name", $._name),
      repeat($._surrounded_pattern),
      optional(
        seq(
          ":",
          field("type", $._expression),
        )
      ),
      optional(
        seq(
          "=",
          field("value", $._expression),
        )
      ),
      ";",
    ),

    con: $ => seq(
      "con",
      field("name", $.identifier),
      // field("arguments", $._arguments),
      optional(
        seq(
          "=",
          field("value", $._expression),
        )
      ),
      ";",
    ),

    fun: $ => seq(
      "fun",
      field("name", $.identifier),
      // field("arguments", $._arguments),
      optional(
        seq(
          ":",
          field("type", $._expression),
        )
      ),
      optional(
        seq(
          "=",
          field("value", $._expression),
        )
      ),
      ";",
    ),

    sigma: $ => seq(
      "Sigma",
      field("name", $.identifier),
      optional($._type_ann),
      optional(
        seq(
          ",",
          field("arity", $.num_literal),
        )
      ),
      // optional(
      //   seq(
      //     "=",
      //     field("value", $.bracket_pattern),
      //   )
      // ),
    ),

    axiom: $ => seq(
      "axm",
      field("name", $.annex),
      ":",
      field("type", $._expression),
      optional(
        seq(
          ",",
          field("normalizer", $.identifier),
        )
      ),
      ";",
    ),

    _pattern: $ => prec.right(2, choice(
      seq($._expression, optional($._type_ann)),
    )),

    _surrounded_pattern: $ => seq(
      /[\(\[\{]/,
      choice(
        $._pattern,
        $._group,
      ),
      repeat(
        seq(
          ",",
          choice(
            $._pattern,
            $._group,
          )
        )
      ),
      /[\)\]\}]/,
    ),

    _group: $ => seq(
      repeat1($.identifier),
      ":", $._expression
    ),

    _symbol: $ => /[_a-zA-Z][_a-zA-Z0-9]*/,

    _name: $ => choice($.identifier, $.annex),

    identifier: $ => $._symbol,

    annex: $ => prec.right(0, seq(
      "%",
      $._symbol,
      ".",
      $._symbol,
      optional(
        seq(".", $._symbol)
      ),
      optional($._subtags),
    )),

    _subtags: $ => seq(
      /\(/,
      $.identifier,
      repeat(
        seq(
          "=",
          $.identifier,
        )
      ),
      repeat(
        seq(
          ",",
          $.identifier,
          repeat(
            seq(
              "=",
              $.identifier,
            )
          )
        )
      ),
      optional(","),
      ")",
    ),

    bool_literal: $ => choice("tt", "ff"),

    num_literal: $ => choice(
       // binary literal
      /[\+\-]?0[bB][01]+/,
       // oct literal
      /[\+\-]?0[oO][0-7]+/,
       // decimal literal
      /[\+\-]?[0-9]+/,
       // hexadecimal literal
      /[\+\-]?0[xX][0-9a-fA-F]+/,
      // decimal float literal x.
      /[\+\-]?[0-9]+\.[0-9]*([eE][\+\-][0-9]+)?/,
      // decimal float literal .x
      /[\+\-]?[0-9]*\.[0-9]+([eE][\+\-][0-9]+)?/,
      // decimal float literal e
      /[\+\-]?[0-9]+[eE][\+\-][0-9]+/,
      // hexadecimal float literal x.
      /[\+\-]?[0-9a-fA-F]+\.[0-9a-fA-F]*([pP][\+\-][0-9]+)?/,
      // hexadecimal float literal .x
      /[\+\-]?[0-9a-fA-F]*\.[0-9a-fA-F]+([pP][\+\-][0-9]+)?/,
      // hexadecimal float literal p
      /[\+\-]?[0-9a-fA-F]+[pP][\+\-][0-9]+/,
    ),

    string_literal: $ => /\"(\\\"|[^\"])*\"/,

    char_literal: $ => /\'(\\.|[^\'])\'/,

    _type_ann: $ => seq(":", $._expression),

    _expression: $ => prec.left(1, choice(
      $._type,
      $._literal,
      seq(/(.bot|⊥)/, optional($._type_ann)),
      seq(/(.top|⊤)/, optional($._type_ann)),
      $.identifier,
      $.annex,
      $._application,
      $._extraction,
      $._surrounded_pattern,
      seq(/\{/, repeat($._declaration), $._expression, "}"),
      seq(/(lam|λ)/, repeat($._pattern), optional($._type_ann), "=", $._expression),
      seq("cn", repeat($._pattern), "=", $._expression),
      seq("fn", repeat($._pattern), optional($._type_ann), "=", $._expression),
      seq("ret", $._pattern, "=", $._expression, "$", $._expression, ";", repeat($._declaration), $._expression)
    )),

    _application: $ => prec.left(1, choice(
      seq($._expression, $._expression),
      seq($._expression, "@", $._expression),
    )),

    _extraction: $ => prec.left(3, seq($._pattern, "#", $._expression)),

    _literal: $ => choice(
      $.bool_literal,
      $.num_literal,
      $.string_literal,
      $.char_literal,
    ),

    _type: $ => prec(1, choice(
      $.primitive_type,
      $.function_type,
      $.array_type,
      seq("Cn", $._pattern),
      seq("Fn", $._pattern, /(->|→)/, $._expression),
    )),

    primitive_type: $ => choice(
      "Univ",
      /Type [0-9]+/,
      "*",
      "□",
      "Nat",
      prec(5, seq("Idx", $._expression)),
      "Bool",
    ),

    function_type: $ => prec.right(
      4,
      choice(
        seq($._expression, /(->|→)/, $._expression),
        seq($._pattern, /(->|→)/, $._expression),
      )
    ),

    array_type: $ => seq(
      choice("«", "⟪", "<<"),
      $._expression,
      ";",
      $._expression,
      choice("»", "⟫", ">>"),
    ),

    line_comment: $ => /\/\/([^/].*)?/,

    doc_comment: $ => seq("///", field("body", /.*/)),

    block_comment: $ => seq("/*", /[\/\*]?|(\*[^\/]|[^\*]\/|[^\/\*])*\*+/, "/"),
  }
});

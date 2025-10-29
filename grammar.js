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
      $.sigma,
      $.axiom,
    ),

    let: $ => prec(4, seq(
      "let",
      choice($._expression, $.annex),
      "=",
      field("value", $._expression),
      ";",
    )),

    lam: $ => seq(
      choice("lam", "con", "fun"),
      optional("extern"),
      field("name", $._name),
      repeat(seq($._expression, optional($.filter))),
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

    // TODO: make filter not get hidden by explicit application
    filter: $ => prec.left(15, seq("@", $._expression)),

    sigma: $ => seq(
      "Sigma",
      optional("extern"),
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

    _pattern: $ => seq(
      /[\(\[\{]/,
      choice(
        $._expression,
        $._group,
      ),
      repeat(
        seq(
          ",",
          choice(
            $._expression,
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
      $._pattern,
      $._annotated_expression,
      seq(/\{/, repeat($._declaration), $._expression, "}"),
      $.lam_expression,
      seq($._declaration, $._expression),
    )),

    _application: $ => prec.left(10, choice(
      seq($._expression, $._expression),
      seq($._expression, "@", $._expression),
    )),

    _extraction: $ => prec.left(3, seq($._expression, "#", $._expression)),

    _annotated_expression: $ => prec.left(-1, seq(
      $._expression, $._type_ann
    )),

    lam_expression: $ => seq(
      choice("lam", "λ", "cn", "fn", "ret"),
      repeat(seq($._expression, optional($.filter))),
      optional(
        seq(
          ":",
          field("type", $._expression),
        )
      ),
      "=",
      field("value", $._expression),
    ),

    _literal: $ => prec.left(7, seq(
      choice(
        $.bool_literal,
        $.num_literal,
        $.string_literal,
        $.char_literal,
      ),
      optional($._type_ann)
    )),

    _type: $ => prec(1, choice(
      $.primitive_type,
      $.function_type,
      $.array_type,
      $.pack,
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
        seq("Cn", $._expression),
        prec(5, seq("Fn", $._expression, /(->|→)/, $._expression)),
      )
    ),

    array_type: $ => seq(
      choice("«", "⟪", "<<"),
      $._expression,
      repeat(seq(
        ",", $._expression
      )),
      ";",
      $._expression,
      choice("»", "⟫", ">>"),
    ),

    pack: $ => seq(
      choice("‹", "⟨", "<"),
      $._expression,
      ";",
      $._expression,
      choice("›", "⟩", ">"),
    ),

    line_comment: $ => /\/\/([^/].*)?/,

    doc_comment: $ => seq("///", field("body", /.*/)),

    block_comment: $ => seq("/*", /[\/\*]?|(\*[^\/]|[^\*]\/|[^\/\*])*\*+/, "/"),
  }
});

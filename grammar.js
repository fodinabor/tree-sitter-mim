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
    $._expression,
    $._type,
  ],

  conflicts: $ => [
    [$.pattern, $.tuple],
    [$.pattern, $._expression],
    [$.group, $._expression],
  ],

  rules: {
    source_file: $ => seq(
      repeat($._dependency),
      repeat(choice($._declaration, ";"))
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

    let: $ => prec(1, seq(
      "let",
      choice($.pattern, $.annex),
      "=",
      field("value", $._expression),
    )),

    lam: $ => prec.left(1, seq(
      choice("lam", "con", "fun"),
      optional("extern"),
      field("name", $._name),
      repeat(seq($.pattern, optional($.filter))),
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
    )),

    filter: $ => seq("@", $._expression),

    sigma: $ => seq(
      "Sigma",
      optional("extern"),
      field("name", $.identifier),
      optional($._type_annotation),
      optional(
        seq(
          ",",
          field("arity", $.int_literal),
        )
      ),
      optional(
        seq(
          "=",
          field("value", $.pattern),
        )
      ),
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
      optional(
        seq(
          ",",
          field("curry", $.int_literal),
          optional(
            seq(
              ",",
              field("trip", $.identifier),
            )
          ),
        )
      ),
    ),

    pattern: $ => prec.right(choice(
      // field("type", $._expression),
      seq(
        $.identifier,
        optional($._type_annotation)
      ),
      seq(
        "(",
          choice(
            $.pattern,
            $.group,
          ),
          repeat(
            seq(
              ",",
              choice(
                $.pattern,
                $.group,
              )
            )
          ),
        ")",
      ),
      seq(
        choice("[", "{"),
          choice(
            $.pattern,
            $.group,
            field("type", $._expression),
          ),
          repeat(
            seq(
              ",",
              choice(
                $.pattern,
                $.group,
                field("type", $._expression),
              ),
            )
          ),
        choice("]", "}"),
      ),
    )),

    battern: $ => choice(
      field("type", $._expression),
      seq($.identifier, $._type_annotation),
    ),

    group: $ => seq(
      $.identifier,
      $.identifier,
      repeat($.identifier),
      $._type_annotation,
    ),

    _symbol: $ => /[_a-zA-Z][_a-zA-Z0-9]*/,

    _name: $ => prec(1, choice($.identifier, $.annex)),

    identifier: $ => $._symbol,

    annex: $ => seq(
      "%",
      $._symbol,
      ".",
      $._symbol,
      optional(
        seq(".", $._symbol)
      ),
      optional($._subtags),
    ),

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

    _literal: $ => choice(
      $.bool_literal,
      $.int_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.other_literal,
    ),

    bool_literal: $ => choice("tt", "ff"),

    int_literal: $ => choice(
       // binary literal
      /[\+\-]?0[bB][01]+/,
       // oct literal
      /[\+\-]?0[oO][0-7]+/,
       // decimal literal
      /[\+\-]?[0-9]+/,
       // hexadecimal literal
      /[\+\-]?0[xX][0-9a-fA-F]+/,
    ),

    float_literal: $ => choice(
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

    other_literal: $ => choice("⊥", ".bot", "⊤", ".top"),

    _expression: $ => choice(
      $.annotated,
      $._type,
      $._literal,
      $.identifier,
      $.annex,
      $.application,
      $.extraction,
      $.block,
      $.lambda,
      $.tuple,
      $.where,
    ),

    block: $ => prec(-10, seq(
      $._declaration,
      repeat(choice($._declaration, ";")),
      $._expression,
    )),

    application: $ => choice(
      prec.left(-1, seq($._expression, $._expression)),
      prec.left(-2, seq($._expression, "@", $._expression)),
    ),

    extraction: $ => prec.left(-3, seq($._expression, "#", $._expression)),

    annotated: $ => prec.left(-5, seq(
      field("value", $._expression),
      $._type_annotation,
    )),

    _type_annotation: $ => seq(":", field("type", $._expression)),

    lambda: $ => prec(1, seq(
      choice("lm", "λ", "cn", "fn", "ret"),
      repeat(seq($.pattern, optional($.filter))),
      optional(
        seq(
          ":",
          field("type", $._expression),
        )
      ),
      "=",
      field("value", $._expression),
    )),

    tuple: $ => seq(
      choice("(", "[", "{"),
      optional(
        seq(
          $._expression,
          repeat(seq(",", $._expression)),
          optional(","),
        )
      ),
      choice(")", "]", "}"),
    ),

    where: $ => prec(-6, seq(
      $._expression,
      "where",
      repeat($._declaration),
      "end",
    )),

    _type: $ => choice(
      $.primitive_type,
      $.function_type,
      $.array_type,
      $.pack,
    ),

    primitive_type: $ => choice(
      "Univ",
      seq("Type", $.int_literal),
      "*",
      "□",
      "Nat",
      prec(5, seq("Idx", $._expression)),
      "Bool",
    ),

    function_type: $ => prec.right(-4,
      choice(
        seq($._expression, choice("->", "→"), $._expression),
        seq($.pattern, choice("->", "→"), $._expression),
        seq("Cn", choice($._expression, $.pattern)),
        prec(5, seq(
          "Fn",
          $.pattern,
          choice("->", "→"),
          $._expression
        )),
      )
    ),

    array_type: $ => seq(
      choice("«", "⟪", "<<"),
      field("size", $._expression),
      repeat(seq(
        ",", field("size", $._expression)
      )),
      optional(","),
      ";",
      field("type", $._expression),
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

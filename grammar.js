/**
 * @file Tree-sitter grammar for Mim, the front-end language of MimIR
 * @author Manuel Lata <contact@mlata.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  def: -2,
  lam: -1,
  fun: 1,
  ann: 2,
  eapp: 3,
  app: 4,
  ext: 5,
};

const PUNCTUATION = [
  "(", ")", "[", "]", "{", "}",
  "‹", "›", "«", "»", "<<", ">>", "<", ">",
  "=", ",", ";", ".", "#", ":", "%", "@",
]

module.exports = grammar({
  name: "mim",

  word: $ => $._symbol,

  externals: $ => [
    $.doc_content,
    $.error_sentinel,
  ],

  extras: $ => [
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
    [$.where, $.array_type],
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

    let: $ => prec(PREC.def, seq(
      "let",
      choice($.pattern, $.annex),
      "=",
      field("value", $._primary_expression),
    )),

    lam: $ => prec.left(PREC.def, seq(
      choice("lam", "con", "fun"),
      optional("extern"),
      field("name", $._name),
      repeat(seq($.pattern, optional($.filter))),
      optional(
        seq(
          ":",
          field("type", $._primary_expression),
        )
      ),
      optional(
        seq(
          "=",
          field("value", $._primary_expression),
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
      field("type", $._primary_expression),
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
        optional(
          seq(
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
          ),
        ),
        ")",
      ),
      seq(
        choice("[", "{"),
          choice(
            $.pattern,
            $.group,
            field("type", $._primary_expression),
          ),
          repeat(
            seq(
              ",",
              choice(
                $.pattern,
                $.group,
                field("type", $._primary_expression),
              ),
            )
          ),
        choice("]", "}"),
      ),
    )),

    battern: $ => choice(
      field("type", $._primary_expression),
      seq($.identifier, $._type_annotation),
    ),

    group: $ => seq(
      $.identifier,
      $.identifier,
      repeat($.identifier),
      $._type_annotation,
    ),

    _symbol: $ => /[_a-zA-Z][_a-zA-Z0-9]*/,

    _name: $ => choice($.identifier, $.annex),

    identifier: $ => choice("return", $._symbol),

    annex: $ => prec.left(seq(
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
      "(",
      $.identifier,
      repeat(
        seq(
          "=",
          field("alias", $.identifier),
        )
      ),
      repeat(
        seq(
          ",",
          $.identifier,
          repeat(
            seq(
              "=",
              field("alias", $.identifier),
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

    float_literal: $ => token(prec(-1, choice(
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
    ))),

    string_literal: $ => /\"(\\\"|[^\"])*\"/,

    char_literal: $ => /\'(\\.|[^\'])\'/,

    other_literal: $ => choice("⊥", ".bot", "⊤", ".top"),

    _primary_expression: $ => prec.left(choice(
      $._expression,
      $.where,
    )),

    where: $ => prec.left(choice(
      seq(
        repeat1(choice($._declaration, ";")),
        $._expression,
      ),
      seq(
        repeat(choice($._declaration, ";")),
        $._expression,
        seq(
          "where",
          repeat(choice($._declaration, ";")),
          "end",
        )
      )
    )),

    _expression: $ => choice(
      $.annotated,
      $._type,
      $._literal,
      $.identifier,
      $.annex,
      $.application,
      $.extraction,
      $.lambda,
      $.tuple,
    ),

    application: $ => choice(
      prec.left(PREC.app, seq($._expression, $._expression)),
      prec.left(PREC.eapp, seq($._expression, "@", $._expression)),
    ),

    extraction: $ => prec.left(PREC.ext, seq($._expression, "#", $._expression)),

    annotated: $ => prec.left(PREC.ann, seq(
      field("value", $._expression),
      $._type_annotation,
    )),

    _type_annotation: $ => seq(":", field("type", $._expression)),

    lambda: $ => prec(PREC.lam, seq(
      choice("lm", "λ", "cn", "fn", "ret"),
      repeat(seq($.pattern, optional($.filter))),
      optional(
        seq(
          ":",
          field("type", $._primary_expression),
        )
      ),
      "=",
      field("value", $._primary_expression),
    )),

    tuple: $ => seq(
      choice("(", "[", "{"),
      optional(
        seq(
          $._primary_expression,
          repeat(seq(",", $._primary_expression)),
          optional(","),
        )
      ),
      choice(")", "]", "}"),
    ),

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
      prec.left(PREC.app, seq("Idx", $._expression)),
      "Bool",
    ),

    function_type: $ => prec.right(PREC.fun,
      choice(
        seq($._expression, choice("->", "→"), $._primary_expression),
        seq($.pattern, choice("->", "→"), $._primary_expression),
        seq("Cn", choice($._primary_expression, $.pattern)),
        seq(
          "Fn",
          $.pattern,
          choice("->", "→"),
          $._primary_expression
        ),
      )
    ),

    array_type: $ => seq(
      choice("«", "⟪", "<<"),
      field("size", $._primary_expression),
      repeat(seq(
        ",", field("size", $._primary_expression)
      )),
      optional(","),
      ";",
      field("type", $._primary_expression),
      choice("»", "⟫", ">>"),
    ),

    pack: $ => seq(
      choice("‹", "⟨", "<"),
      $._primary_expression,
      ";",
      $._primary_expression,
      choice("›", "⟩", ">"),
    ),

    line_comment: $ => /\/\/([^/].*)?/,

    doc_comment: $ => seq("///", $.doc_content),

    block_comment: $ => seq("/*", /[\/\*]?|(\*[^\/]|[^\*]\/|[^\/\*])*\*+/, "/"),

    error_sentinel: $ => "unused token",
  }
});

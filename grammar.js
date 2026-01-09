/**
 * @file Tree-sitter grammar for Mim, the front-end language of MimIR
 * @author Manuel Lata <contact@mlata.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  bot: -2,
  ann: -1,
  where: 1,
  arrow: 2,
  pi: 3,
  inj: 5,
  app: 6,
  union: 7,
  ext: 8,
};

const PUNCTUATION = [
  "(", ")", "[", "]", "{", "}",
  "‹", "›", "«", "»", "<<", ">>", "<", ">",
  "=", ",", ";", ".", "#", ":", "%", "@",
]

function tuple_pattern($, open, close, pattern) {
  return seq(
    open,
    optional(
      seq(
        choice(
          $.group,
          pattern,
        ),
        repeat(
          seq(
            ",",
            choice(
              $.group,
              pattern,
            )
          )
        ),
      ),
    ),
    close,
  )
}

module.exports = grammar({
  name: "mim",

  word: $ => $.identifier,

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
    $.dependency,
    $.declaration,
    $.expression,
    $.primary_expression,
    $.infix_expression,

    $.pi_domain,
    $.lam_domain,
    $.binder,
  ],

  conflicts: $ => [
    [$.pattern, $.battern],
  ],

  rules: {
    source_file: $ => seq(
      repeat($.dependency),
      optional($._declarations),
    ),

    dependency: $ => choice(
      $.import,
      $.plugin,
    ),

    import: $ => seq("import", $.identifier, ";"),

    plugin: $ => seq("plugin", $.identifier, ";"),

    _declarations: $ => prec.left(repeat1(seq(
      $.declaration,
      optional(";"),
    ))),

    declaration: $ => choice(
      $.let,
      $.lam,
      $.axiom,
    ),

    let: $ => seq(
      "let",
      choice($.binder, $.annex),
      "=",
      field("value", $.expression),
    ),

    lam: $ => prec.left(seq(
      choice("lam", "con", "fun"),
      optional("extern"),
      field("name", $._name),
      repeat(seq(prec(PREC.pi, $.lam_domain), optional($.filter))),
      optional(
        seq(
          ":",
          field("type", $.expression),
        )
      ),
      optional(
        seq(
          "=",
          field("value", $.expression),
        )
      ),
    )),

    filter: $ => seq("@", $.expression),

    axiom: $ => seq(
      "axm",
      field("name", $.annex),
      ":",
      field("type", $.expression),
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

    lam_domain: $ => choice(
      $.pattern,
      $.battern,
      $.implicit,
    ),

    binder: $ => choice(
      $.pattern,
      $.battern,
    ),

    pi_domain: $ => choice(
      $.battern,
      $.implicit,
    ),

    pattern: $ => prec.left(choice(
      tuple_pattern($, token(prec(10, "(")), ")", $.pattern),
      seq($.identifier, $._type_annotation),
      prec(1, $.identifier),
    )),

    battern: $ => choice(
      tuple_pattern($, "[", "]", $.battern),
      seq($.identifier, $._type_annotation),
      prec.right(-10, field("type", $.expression)),
    ),

    implicit: $ => choice(
      tuple_pattern($, "{", "}", $.battern),
    ),

    group: $ => seq(
      $.identifier,
      $.identifier,
      repeat($.identifier),
      $._type_annotation,
    ),

    _name: $ => choice($.identifier, $.annex),

    identifier: $ => /[_a-zA-Z][_a-zA-Z0-9]*/,

    annex: $ => prec.left(seq(
      "%",
      field("module", $.identifier),
      ".",
      field("name", $.identifier),
      optional(
        choice(
          seq(".", field("subtag", $.identifier)),
          $._subtags,
        )
      )
    )),

    _subtags: $ => seq(
      "(",
      field("subtag", $.identifier),
      repeat(
        seq(
          "=",
          field("subtag", $.identifier),
        )
      ),
      repeat(
        seq(
          ",",
          field("subtag", $.identifier),
          repeat(
            seq(
              "=",
              field("subtag", $.identifier),
            )
          )
        )
      ),
      optional(","),
      ")",
    ),

    _literal: $ => choice(
      $.annotated,
      $.bool_literal,
      $.int_literal,
      $.float_literal,
      $.string_literal,
      $.char_literal,
      $.other_literal,
    ),

    annotated: $ => prec.left(PREC.ann, seq(
      field("value", $._literal),
      $._type_annotation,
    )),

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

    expression: $ => choice(
      $.primary_expression,
      $.infix_expression,
    ),

    primary_expression: $ => prec.left(choice(
      $.primitive,
      $.identifier,
      $.annex,
      $._literal,
      $.decl_expr,
      $.pi,
      $.lambda,
      $.insert,
      $.ret,
      $.uniq,
      $.array,
      $.pack,
      $.tuple,
      $.match,
    )),

    primitive: $ => choice(
      "Univ",
      "Nat",
      "Idx",
      "Bool",
      "I1",
      "I8",
      "I16",
      "I32",
      "I64",
      "*", "★",
      "□"
    ),

    decl_expr: $ => seq(
      $._declarations,
      $.expression,
    ),

    _lm: $ => choice(
      "lm",
      "λ",
      "fn",
    ),

    _arrow: $ => choice(
      "->",
      "→"
    ),

    pi: $ => prec.left(choice(
      seq(prec(PREC.pi, $.pi_domain), $._arrow, $.expression),
      seq("Cn", $.pi_domain),
      seq("Fn", prec(PREC.pi, $.pi_domain), $._arrow, $.expression),
    )),

    lambda: $ => choice(
      seq(
        $._lm, prec(PREC.pi, $.lam_domain),
        optional(seq(":", $.expression)),
        "=", $.expression,
      ),
      seq(
        "cn", repeat1($.pattern),
        "=", $.expression,
      )
    ),

    // insertion expression: `ins ((0, 1), 2, 2)`
    insert: $ => seq(
      choice("ins", "insert"),
      "(",
      $.expression, // tuple to insert into
      ",",
      $.expression, // insertion index
      ",",
      $.expression, // insert value
      ")",
    ),

    uniq: $ => seq(
      choice("{|", "⦃"),
      $.expression, // singleton type
      choice("|}", "⦄")
    ),

    ret: $ => seq(
      "ret", $.binder,
      "=", $.expression, // callee
      "$", $.expression, // argument
      ";", $.expression, // continuation body
    ),

    array: $ => seq(
      choice("«", "⟪", "<<"),
      field("size", $.expression),
      repeat(seq(
        ",", field("size", $.expression)
      )),
      optional(","),
      ";",
      field("type", $.expression),
      choice("»", "⟫", ">>"),
    ),

    pack: $ => seq(
      choice("‹", "⟨", "<"),
      $.expression,
      ";",
      $.expression,
      choice("›", "⟩", ">"),
    ),

    tuple: $ => seq(
      "(",
      optional(
        seq(
          $.expression,
          repeat(seq(",", $.expression)),
          optional(","),
        )
      ),
      ")",
    ),

    match: $ => prec.left(seq(
      "match",
      $.expression,
      "with",
      optional($.match_arm),
      repeat(
        seq(
          "|",
          $.match_arm,
        )
      )
    )),

    match_arm: $ => seq(
      $.binder,
      "=>",
      $.expression,
    ),

    infix_expression: $ => choice(
      $.extraction,
      $.arrow,
      $.union,
      $.injection,
      $.application,
      $.where,
    ),

    extraction: $ => prec.left(PREC.ext, seq($.expression, "#", $.expression)),

    arrow: $ => prec.right(PREC.arrow,
      seq($.expression, choice("->", "→"), $.expression),
    ),

    union: $ => prec.left(PREC.union, seq(
      $.expression,
      repeat1(
        seq(
          "∪",
          $.expression,
        )
      )
    )),

    injection: $ => prec.left(PREC.inj, seq(
      $.expression,
      "inj",
      $.expression,
    )),

    application: $ => choice(
      prec.left(PREC.app, seq($.expression, $.expression)),
      prec.left(PREC.app, seq($.expression, "@", $.expression)),
    ),

    where: $ => prec.left(PREC.where, choice(
      seq(
        $.expression,
        seq(
          "where",
          repeat(choice($.declaration, ";")),
          "end",
        )
      ),
    )),

    _type_annotation: $ => seq(":", field("type", $.expression)),

    line_comment: $ => /\/\/([^/].*)?/,

    doc_comment: $ => seq("///", $.doc_content),

    block_comment: $ => seq("/*", /[\/\*]?|(\*[^\/]|[^\*]\/|[^\/\*])*\*+/, "/"),

    error_sentinel: $ => "unused token",
  }
});

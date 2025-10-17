import XCTest
import SwiftTreeSitter
import TreeSitterMim

final class TreeSitterMimTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_mim())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Mim grammar")
    }
}

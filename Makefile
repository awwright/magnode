all: .REBUILD

test: .REBUILD
	t/runner.js t/*.yht

.REBUILD:
	@true

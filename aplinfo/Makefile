
DOCDIR=/usr/share/doc/pve-manager/

TRUSTED_KEYS=				\
	proxmox-release-bookworm.gpg	\
	proxmox-release-trixie.gpg	\
	release@turnkeylinux.com.pubkey

all:

.PHONY: install
install: aplinfo.dat trustedkeys.gpg
	install -D -m 0644 aplinfo.dat $(DESTDIR)$(DOCDIR)/aplinfo.dat
	install -D -m 0644 trustedkeys.gpg $(DESTDIR)$(DOCDIR)/trustedkeys.gpg

.PHONY: update
update:
	rm -f aplinfo.dat
	wget https://mirrors.ustc.edu.cn/proxmox/images/aplinfo-pve-9.dat -O aplinfo.dat.tmp
	mv aplinfo.dat.tmp aplinfo.dat

trustedkeys.gpg: $(TRUSTED_KEYS)
	sq keyring merge --output $@.tmp $(TRUSTED_KEYS)
	mv $@.tmp $@

.PHONY: clean
clean:
	rm -rf *~ aplinfo.dat.gz aplinfo.dat.asc trustedkeys.gpg

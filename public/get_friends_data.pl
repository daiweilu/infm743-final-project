#!/usr/bin/perl

use CGI qw(:standard);
use LWP::UserAgent; # install Mozilla::CA module to enable SSL calls
use JSON;
use Data::Dumper;
use strict;
use warnings;


my $access_token = param('access_token');

my $ua = LWP::UserAgent->new;
$ua->timeout(10);
$ua->env_proxy;

my $response = $ua->get("https://graph.facebook.com/me?fields=friends.fields(birthday,name)&access_token=$access_token");

print header(-type => "application/json", -charset => "utf-8");
if ($response->is_success) {
  print $response->decoded_content;
}
else {
  print $response->decoded_content;
}
